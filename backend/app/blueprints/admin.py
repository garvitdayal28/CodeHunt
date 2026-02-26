"""
Hotel Admin Blueprint — Bookings, occupancy, alerts, and late check-out management.
"""

from flask import Blueprint, request, g
from app.utils.auth import require_auth, require_role
from app.utils.responses import success_response, error_response
from app.services.firebase_service import get_firestore_client
from app.services.cloudinary_service import upload_image
from app.services.redis_service import publish_event
from datetime import datetime

admin_bp = Blueprint("admin", __name__, url_prefix="/api/admin/hotel")

EDITABLE_PROPERTY_FIELDS = {
    "name",
    "location",
    "address",
    "description",
    "price_per_night",
    "rating",
    "total_rooms",
    "amenities",
    "image_urls",
}


def _get_admin_property(db, uid):
    props = db.collection("properties").where("admin_uid", "==", uid).limit(1).stream()
    return next(props, None)


def _to_string_list(value):
    if isinstance(value, str):
        return [item.strip() for item in value.split(",") if item.strip()]
    if isinstance(value, list):
        return [str(item).strip() for item in value if str(item).strip()]
    return []


def _normalize_room_payload(data, partial=False):
    if not isinstance(data, dict):
        raise ValueError("Request body must be a JSON object.")

    payload = {}

    if "name" in data or not partial:
        name = str(data.get("name", "")).strip()
        if not name:
            raise ValueError("name is required.")
        payload["name"] = name

    if "description" in data:
        payload["description"] = str(data.get("description") or "").strip()
    elif not partial:
        payload["description"] = ""

    if "price_per_day" in data or not partial:
        try:
            price_per_day = float(data.get("price_per_day"))
            if price_per_day < 0:
                raise ValueError
        except (TypeError, ValueError):
            raise ValueError("price_per_day must be a non-negative number.")
        payload["price_per_day"] = price_per_day

    if "total_rooms" in data or not partial:
        try:
            total_rooms = int(data.get("total_rooms"))
            if total_rooms < 1:
                raise ValueError
        except (TypeError, ValueError):
            raise ValueError("total_rooms must be an integer greater than 0.")
        payload["total_rooms"] = total_rooms

    if "beds" in data or not partial:
        try:
            beds = int(data.get("beds"))
            if beds < 1:
                raise ValueError
        except (TypeError, ValueError):
            raise ValueError("beds must be an integer greater than 0.")
        payload["beds"] = beds

    if "max_guests" in data:
        try:
            max_guests = int(data.get("max_guests"))
            if max_guests < 1:
                raise ValueError
        except (TypeError, ValueError):
            raise ValueError("max_guests must be an integer greater than 0.")
        payload["max_guests"] = max_guests
    elif not partial:
        payload["max_guests"] = max(2, payload.get("beds", 1) * 2)

    if "area_sqft" in data:
        try:
            area_sqft = float(data.get("area_sqft"))
            if area_sqft <= 0:
                raise ValueError
        except (TypeError, ValueError):
            raise ValueError("area_sqft must be a positive number.")
        payload["area_sqft"] = area_sqft
    elif not partial:
        payload["area_sqft"] = None

    if "room_count_available" in data:
        try:
            room_count_available = int(data.get("room_count_available"))
            if room_count_available < 0:
                raise ValueError
        except (TypeError, ValueError):
            raise ValueError("room_count_available must be a non-negative integer.")
        payload["room_count_available"] = room_count_available
    elif not partial and "total_rooms" in payload:
        payload["room_count_available"] = payload["total_rooms"]

    if "amenities" in data:
        payload["amenities"] = _to_string_list(data.get("amenities"))
    elif not partial:
        payload["amenities"] = []

    if "images" in data:
        if not isinstance(data.get("images"), list):
            raise ValueError("images must be a list of URLs.")
        payload["images"] = [str(url).strip() for url in data.get("images") if str(url).strip()]
    elif not partial:
        payload["images"] = []

    if payload.get("images"):
        payload["cover_image"] = payload["images"][0]
    elif "images" in payload:
        payload["cover_image"] = None

    return payload


@admin_bp.route("/bookings", methods=["GET"])
@require_auth
@require_role("HOTEL_ADMIN", "PLATFORM_ADMIN")
def get_hotel_bookings():
    """List all bookings for the admin's property with optional filters."""
    db = get_firestore_client()
    uid = g.current_user["uid"]

    # Get the admin's property
    property_doc = _get_admin_property(db, uid)
    if not property_doc:
        return error_response("NO_PROPERTY", "No property linked to this admin.", 404)

    property_id = property_doc.id

    # Query bookings across all itineraries that reference this property
    # For MVP, we query all itineraries and filter bookings by property_id
    status_filter = request.args.get("status")
    bookings = []

    # Use collection group query for bookings subcollection
    query = db.collection_group("bookings").where("property_id", "==", property_id)
    if status_filter:
        query = query.where("status", "==", status_filter)

    for doc in query.stream():
        booking = doc.to_dict()
        booking["id"] = doc.id
        bookings.append(booking)

    return success_response(bookings)


@admin_bp.route("/occupancy", methods=["GET"])
@require_auth
@require_role("HOTEL_ADMIN", "PLATFORM_ADMIN")
def get_occupancy():
    """Occupancy data aggregated by date for the heatmap (next 60 days)."""
    db = get_firestore_client()
    uid = g.current_user["uid"]

    property_doc = _get_admin_property(db, uid)
    if not property_doc:
        return error_response("NO_PROPERTY", "No property linked to this admin.", 404)

    property_data = property_doc.to_dict()
    property_id = property_doc.id
    total_rooms = property_data.get("total_rooms", 1)

    # Fetch bookings for this property
    query = db.collection_group("bookings").where("property_id", "==", property_id)
    bookings = [doc.to_dict() for doc in query.stream()]

    # Aggregate by date
    from datetime import timedelta
    today = datetime.utcnow().date()
    occupancy = {}

    for day_offset in range(60):
        date = today + timedelta(days=day_offset)
        date_str = date.isoformat()
        count = 0
        for b in bookings:
            check_in = b.get("check_in_date", "")
            check_out = b.get("check_out_date", "")
            if check_in <= date_str <= check_out:
                count += 1
        occupancy[date_str] = {
            "date": date_str,
            "occupied": count,
            "total": total_rooms,
            "percentage": round((count / total_rooms) * 100, 1) if total_rooms > 0 else 0,
        }

    return success_response(occupancy)


@admin_bp.route("/profile", methods=["GET"])
@require_auth
@require_role("HOTEL_ADMIN", "PLATFORM_ADMIN")
def get_hotel_profile():
    """Get property profile for the logged-in hotel admin."""
    db = get_firestore_client()
    uid = g.current_user["uid"]

    property_doc = _get_admin_property(db, uid)
    if not property_doc:
        return error_response("NO_PROPERTY", "No property linked to this admin.", 404)

    property_data = property_doc.to_dict()
    property_data["id"] = property_doc.id
    return success_response(property_data)


@admin_bp.route("/profile", methods=["PUT"])
@require_auth
@require_role("HOTEL_ADMIN", "PLATFORM_ADMIN")
def update_hotel_profile():
    """Update editable property profile fields for the logged-in hotel admin."""
    data = request.get_json()
    if not data or not isinstance(data, dict):
        return error_response("INVALID_BODY", "Request body must be JSON object.", 400)

    db = get_firestore_client()
    uid = g.current_user["uid"]
    property_doc = _get_admin_property(db, uid)
    if not property_doc:
        return error_response("NO_PROPERTY", "No property linked to this admin.", 404)

    update_payload = {}
    for field in EDITABLE_PROPERTY_FIELDS:
        if field not in data:
            continue
        value = data[field]
        if field in {"price_per_night", "rating"}:
            try:
                value = float(value)
            except (TypeError, ValueError):
                return error_response("INVALID_FIELD", f"{field} must be a valid number.", 400)
        elif field == "total_rooms":
            try:
                value = int(value)
                if value < 1:
                    raise ValueError
            except (TypeError, ValueError):
                return error_response("INVALID_FIELD", "total_rooms must be an integer greater than 0.", 400)
        elif field == "amenities":
            value = _to_string_list(value)
        elif field == "image_urls":
            if not isinstance(value, list):
                return error_response("INVALID_FIELD", "image_urls must be a list of URLs.", 400)
            value = [str(item).strip() for item in value if str(item).strip()]
        elif value is not None:
            value = str(value).strip()
        update_payload[field] = value

    if not update_payload:
        return error_response("NO_FIELDS", "No editable fields provided.", 400)

    update_payload["updated_at"] = datetime.utcnow().isoformat()
    db.collection("properties").document(property_doc.id).set(update_payload, merge=True)

    updated_doc = db.collection("properties").document(property_doc.id).get()
    updated = updated_doc.to_dict()
    updated["id"] = updated_doc.id
    return success_response(updated, 200, "Hotel profile updated successfully.")


@admin_bp.route("/upload-image", methods=["POST"])
@require_auth
@require_role("HOTEL_ADMIN", "PLATFORM_ADMIN")
def upload_hotel_image():
    """Upload a hotel-related image to Cloudinary and return secure URL."""
    db = get_firestore_client()
    uid = g.current_user["uid"]
    property_doc = _get_admin_property(db, uid)
    if not property_doc:
        return error_response("NO_PROPERTY", "No property linked to this admin.", 404)

    file_obj = request.files.get("file")
    if not file_obj:
        return error_response("MISSING_FILE", "file is required as multipart form-data.", 400)

    folder = request.form.get("folder") or f"tripallied/properties/{property_doc.id}"
    try:
        uploaded = upload_image(file_obj, folder=folder)
    except ValueError as e:
        return error_response("UPLOAD_CONFIG_ERROR", str(e), 400)
    except RuntimeError as e:
        return error_response("UPLOAD_FAILED", str(e), 502)
    except Exception as e:
        return error_response("UPLOAD_FAILED", f"Unexpected upload error: {e}", 500)

    return success_response(uploaded, 200, "Image uploaded successfully.")


@admin_bp.route("/profile/images", methods=["POST"])
@require_auth
@require_role("HOTEL_ADMIN", "PLATFORM_ADMIN")
def add_hotel_profile_image():
    """Attach a Cloudinary image URL to property profile gallery."""
    data = request.get_json()
    if not data or not isinstance(data, dict):
        return error_response("INVALID_BODY", "Request body must be JSON object.", 400)

    image_url = str(data.get("image_url") or "").strip()
    if not image_url:
        return error_response("MISSING_IMAGE_URL", "image_url is required.", 400)

    db = get_firestore_client()
    uid = g.current_user["uid"]
    property_doc = _get_admin_property(db, uid)
    if not property_doc:
        return error_response("NO_PROPERTY", "No property linked to this admin.", 404)

    prop_ref = db.collection("properties").document(property_doc.id)
    current = prop_ref.get().to_dict() or {}
    image_urls = current.get("image_urls") or []
    if image_url not in image_urls:
        image_urls.append(image_url)

    prop_ref.set({"image_urls": image_urls, "updated_at": datetime.utcnow().isoformat()}, merge=True)
    updated = prop_ref.get().to_dict() or {}
    updated["id"] = property_doc.id
    return success_response(updated, 200, "Hotel image added.")


@admin_bp.route("/profile/images", methods=["DELETE"])
@require_auth
@require_role("HOTEL_ADMIN", "PLATFORM_ADMIN")
def remove_hotel_profile_image():
    """Remove an image URL from property profile gallery."""
    data = request.get_json() or {}
    image_url = str(data.get("image_url") or "").strip()
    if not image_url:
        return error_response("MISSING_IMAGE_URL", "image_url is required.", 400)

    db = get_firestore_client()
    uid = g.current_user["uid"]
    property_doc = _get_admin_property(db, uid)
    if not property_doc:
        return error_response("NO_PROPERTY", "No property linked to this admin.", 404)

    prop_ref = db.collection("properties").document(property_doc.id)
    current = prop_ref.get().to_dict() or {}
    image_urls = [url for url in (current.get("image_urls") or []) if str(url).strip() != image_url]
    prop_ref.set({"image_urls": image_urls, "updated_at": datetime.utcnow().isoformat()}, merge=True)
    updated = prop_ref.get().to_dict() or {}
    updated["id"] = property_doc.id
    return success_response(updated, 200, "Hotel image removed.")


@admin_bp.route("/rooms", methods=["GET"])
@require_auth
@require_role("HOTEL_ADMIN", "PLATFORM_ADMIN")
def get_room_types():
    """List room types for the current hotel property."""
    db = get_firestore_client()
    uid = g.current_user["uid"]
    property_doc = _get_admin_property(db, uid)
    if not property_doc:
        return error_response("NO_PROPERTY", "No property linked to this admin.", 404)

    rooms = []
    query = db.collection("properties").document(property_doc.id).collection("room_types")
    for doc in query.stream():
        room = doc.to_dict() or {}
        room["id"] = doc.id
        rooms.append(room)

    rooms.sort(key=lambda item: item.get("created_at", ""), reverse=True)
    return success_response(rooms)


@admin_bp.route("/rooms", methods=["POST"])
@require_auth
@require_role("HOTEL_ADMIN", "PLATFORM_ADMIN")
def create_room_type():
    """Create a room type entry for this property."""
    data = request.get_json()
    if not data:
        return error_response("INVALID_BODY", "Request body must be JSON object.", 400)

    try:
        payload = _normalize_room_payload(data, partial=False)
    except ValueError as e:
        return error_response("INVALID_ROOM_DATA", str(e), 400)

    db = get_firestore_client()
    uid = g.current_user["uid"]
    property_doc = _get_admin_property(db, uid)
    if not property_doc:
        return error_response("NO_PROPERTY", "No property linked to this admin.", 404)

    now_iso = datetime.utcnow().isoformat()
    payload["created_at"] = now_iso
    payload["updated_at"] = now_iso
    payload["is_active"] = True

    room_ref = db.collection("properties").document(property_doc.id).collection("room_types").document()
    room_ref.set(payload)
    created = room_ref.get().to_dict() or {}
    created["id"] = room_ref.id
    return success_response(created, 201, "Room type created successfully.")


@admin_bp.route("/rooms/<room_id>", methods=["PUT"])
@require_auth
@require_role("HOTEL_ADMIN", "PLATFORM_ADMIN")
def update_room_type(room_id):
    """Update an existing room type."""
    data = request.get_json()
    if not data:
        return error_response("INVALID_BODY", "Request body must be JSON object.", 400)

    try:
        payload = _normalize_room_payload(data, partial=True)
    except ValueError as e:
        return error_response("INVALID_ROOM_DATA", str(e), 400)

    if not payload:
        return error_response("NO_FIELDS", "No room fields provided.", 400)

    db = get_firestore_client()
    uid = g.current_user["uid"]
    property_doc = _get_admin_property(db, uid)
    if not property_doc:
        return error_response("NO_PROPERTY", "No property linked to this admin.", 404)

    room_ref = db.collection("properties").document(property_doc.id).collection("room_types").document(room_id)
    room_doc = room_ref.get()
    if not room_doc.exists:
        return error_response("NOT_FOUND", "Room type not found.", 404)

    payload["updated_at"] = datetime.utcnow().isoformat()
    room_ref.set(payload, merge=True)
    updated = room_ref.get().to_dict() or {}
    updated["id"] = room_id
    return success_response(updated, 200, "Room type updated successfully.")


@admin_bp.route("/rooms/<room_id>", methods=["DELETE"])
@require_auth
@require_role("HOTEL_ADMIN", "PLATFORM_ADMIN")
def delete_room_type(room_id):
    """Delete a room type from this property."""
    db = get_firestore_client()
    uid = g.current_user["uid"]
    property_doc = _get_admin_property(db, uid)
    if not property_doc:
        return error_response("NO_PROPERTY", "No property linked to this admin.", 404)

    room_ref = db.collection("properties").document(property_doc.id).collection("room_types").document(room_id)
    room_doc = room_ref.get()
    if not room_doc.exists:
        return error_response("NOT_FOUND", "Room type not found.", 404)

    room_ref.delete()
    return success_response({"id": room_id}, 200, "Room type deleted successfully.")


@admin_bp.route("/alerts", methods=["GET"])
@require_auth
@require_role("HOTEL_ADMIN", "PLATFORM_ADMIN")
def get_alerts():
    """Get all pending alerts for this hotel admin."""
    db = get_firestore_client()
    uid = g.current_user["uid"]

    query = (
        db.collection("alerts")
        .where("target_uid", "==", uid)
        .where("read", "==", False)
        .order_by("created_at", direction="DESCENDING")
    )

    alerts = []
    for doc in query.stream():
        alert = doc.to_dict()
        alert["id"] = doc.id
        alerts.append(alert)

    return success_response(alerts)


@admin_bp.route("/alerts/<alert_id>", methods=["PATCH"])
@require_auth
@require_role("HOTEL_ADMIN", "PLATFORM_ADMIN")
def mark_alert_read(alert_id):
    """Mark an alert as read."""
    db = get_firestore_client()
    db.collection("alerts").document(alert_id).update({"read": True})
    return success_response({"id": alert_id, "read": True})


@admin_bp.route("/late-checkout/<booking_id>", methods=["PATCH"])
@require_auth
@require_role("HOTEL_ADMIN", "PLATFORM_ADMIN")
def handle_late_checkout(booking_id):
    """Approve or deny a late check-out request."""
    data = request.get_json()
    if not data:
        return error_response("INVALID_BODY", "Request body must be JSON.", 400)

    decision = data.get("decision")  # "APPROVED" or "DENIED"
    if decision not in ["APPROVED", "DENIED"]:
        return error_response("INVALID_DECISION", "Decision must be APPROVED or DENIED.", 400)

    db = get_firestore_client()

    # Find the alert for this late checkout
    alert_query = (
        db.collection("alerts")
        .where("booking_id", "==", booking_id)
        .where("alert_type", "==", "LATE_CHECKOUT_REQUEST")
        .limit(1)
    )
    alert_doc = next(alert_query.stream(), None)

    if alert_doc:
        alert_data = alert_doc.to_dict()
        db.collection("alerts").document(alert_doc.id).update({
            "read": True,
            "decision": decision,
        })

        # Notify the traveler via SSE
        publish_event("disruptions", {
            "event_type": "LATE_CHECKOUT_DECISION",
            "booking_id": booking_id,
            "decision": decision,
            "timestamp": datetime.utcnow().isoformat(),
        })

        # Create a response alert for the traveler
        traveler_uid = alert_data.get("requester_uid")
        if traveler_uid:
            db.collection("alerts").add({
                "target_uid": traveler_uid,
                "alert_type": "LATE_CHECKOUT_RESPONSE",
                "message": f"Your late check-out request was {decision.lower()}.",
                "booking_id": booking_id,
                "read": False,
                "created_at": datetime.utcnow().isoformat(),
            })

    return success_response({
        "booking_id": booking_id,
        "decision": decision,
    }, 200, f"Late check-out {decision.lower()}.")
