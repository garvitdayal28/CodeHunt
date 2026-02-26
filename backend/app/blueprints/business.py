"""
Business Blueprint - business profile retrieval and updates.
"""

from datetime import datetime

from flask import Blueprint, g, request

from app.services.cloudinary_service import upload_image
from app.services.firebase_service import get_firestore_client
from app.utils.auth import require_auth, require_role
from app.utils.business_profile import BUSINESS_ROLE, validate_and_normalize_business_profile
from app.utils.responses import error_response, success_response

business_bp = Blueprint("business", __name__, url_prefix="/api/business")


def _require_hotel_business_user(db, uid):
    user_doc = db.collection("users").document(uid).get()
    if not user_doc.exists:
        return None
    user_data = user_doc.to_dict() or {}
    if user_data.get("role") != BUSINESS_ROLE:
        return None
    business_profile = user_data.get("business_profile") or {}
    if business_profile.get("business_type") != "HOTEL":
        return None
    return user_data


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


@business_bp.route("/profile", methods=["GET"])
@require_auth
@require_role(BUSINESS_ROLE)
def get_business_profile():
    """Return the authenticated business user's profile."""
    db = get_firestore_client()
    uid = g.current_user["uid"]

    user_doc = db.collection("users").document(uid).get()
    if not user_doc.exists:
        return error_response("USER_NOT_FOUND", "User profile not found.", 404)

    user_data = user_doc.to_dict()
    if user_data.get("role") != BUSINESS_ROLE:
        return error_response("INVALID_ROLE", "User is not registered as BUSINESS.", 400)

    return success_response(
        {
            "uid": user_data.get("uid"),
            "email": user_data.get("email"),
            "display_name": user_data.get("display_name"),
            "role": user_data.get("role"),
            "business_profile": user_data.get("business_profile", {}),
        }
    )


@business_bp.route("/profile", methods=["PUT"])
@require_auth
@require_role(BUSINESS_ROLE)
def update_business_profile():
    """Update business profile details for the authenticated business user."""
    data = request.get_json()
    if not data or not isinstance(data, dict):
        return error_response("INVALID_BODY", "Request body must be a JSON object.", 400)

    business_profile_data = data.get("business_profile")
    if not business_profile_data:
        return error_response("MISSING_BUSINESS_PROFILE", "business_profile is required.", 400)

    try:
        normalized_business_profile = validate_and_normalize_business_profile(business_profile_data)
    except ValueError as e:
        return error_response("INVALID_BUSINESS_PROFILE", str(e), 400)

    uid = g.current_user["uid"]
    update_payload = {
        "role": BUSINESS_ROLE,
        "business_profile": normalized_business_profile,
        "updated_at": datetime.utcnow().isoformat(),
    }

    display_name = data.get("display_name")
    if isinstance(display_name, str) and display_name.strip():
        update_payload["display_name"] = display_name.strip()

    db = get_firestore_client()
    db.collection("users").document(uid).set(update_payload, merge=True)

    return success_response(
        {
            "uid": uid,
            "display_name": update_payload.get("display_name"),
            "business_profile": normalized_business_profile,
        },
        200,
        "Business profile updated successfully.",
    )


@business_bp.route("/hotel/upload-image", methods=["POST"])
@require_auth
@require_role(BUSINESS_ROLE)
def upload_hotel_business_image():
    """Upload a hotel/business image for BUSINESS users with HOTEL subtype."""
    db = get_firestore_client()
    uid = g.current_user["uid"]
    user_data = _require_hotel_business_user(db, uid)
    if not user_data:
        return error_response("INVALID_ROLE", "Only HOTEL business accounts can upload hotel images.", 403)

    file_obj = request.files.get("file")
    if not file_obj:
        return error_response("MISSING_FILE", "file is required as multipart form-data.", 400)

    folder = request.form.get("folder") or f"tripallied/business/{uid}/hotel"
    try:
        uploaded = upload_image(file_obj, folder=folder)
    except ValueError as e:
        return error_response("UPLOAD_CONFIG_ERROR", str(e), 400)
    except RuntimeError as e:
        return error_response("UPLOAD_FAILED", str(e), 502)
    except Exception as e:
        return error_response("UPLOAD_FAILED", f"Unexpected upload error: {e}", 500)

    return success_response(uploaded, 200, "Image uploaded successfully.")


@business_bp.route("/hotel/rooms", methods=["GET"])
@require_auth
@require_role(BUSINESS_ROLE)
def get_hotel_business_room_types():
    """List room types for a BUSINESS user with HOTEL subtype."""
    db = get_firestore_client()
    uid = g.current_user["uid"]
    user_data = _require_hotel_business_user(db, uid)
    if not user_data:
        return error_response("INVALID_ROLE", "Only HOTEL business accounts can manage room types.", 403)

    rooms = []
    for doc in db.collection("users").document(uid).collection("room_types").stream():
        room = doc.to_dict() or {}
        room["id"] = doc.id
        rooms.append(room)

    rooms.sort(key=lambda item: item.get("created_at", ""), reverse=True)
    return success_response(rooms)


@business_bp.route("/hotel/rooms", methods=["POST"])
@require_auth
@require_role(BUSINESS_ROLE)
def create_hotel_business_room_type():
    """Create a room type for a BUSINESS user with HOTEL subtype."""
    data = request.get_json()
    if not data:
        return error_response("INVALID_BODY", "Request body must be a JSON object.", 400)

    try:
        payload = _normalize_room_payload(data, partial=False)
    except ValueError as e:
        return error_response("INVALID_ROOM_DATA", str(e), 400)

    db = get_firestore_client()
    uid = g.current_user["uid"]
    user_data = _require_hotel_business_user(db, uid)
    if not user_data:
        return error_response("INVALID_ROLE", "Only HOTEL business accounts can manage room types.", 403)

    now_iso = datetime.utcnow().isoformat()
    payload["created_at"] = now_iso
    payload["updated_at"] = now_iso
    payload["is_active"] = True

    room_ref = db.collection("users").document(uid).collection("room_types").document()
    room_ref.set(payload)
    created = room_ref.get().to_dict() or {}
    created["id"] = room_ref.id
    return success_response(created, 201, "Room type created successfully.")


@business_bp.route("/hotel/rooms/<room_id>", methods=["PUT"])
@require_auth
@require_role(BUSINESS_ROLE)
def update_hotel_business_room_type(room_id):
    """Update a room type for a BUSINESS user with HOTEL subtype."""
    data = request.get_json()
    if not data:
        return error_response("INVALID_BODY", "Request body must be a JSON object.", 400)

    try:
        payload = _normalize_room_payload(data, partial=True)
    except ValueError as e:
        return error_response("INVALID_ROOM_DATA", str(e), 400)

    if not payload:
        return error_response("NO_FIELDS", "No room fields provided.", 400)

    db = get_firestore_client()
    uid = g.current_user["uid"]
    user_data = _require_hotel_business_user(db, uid)
    if not user_data:
        return error_response("INVALID_ROLE", "Only HOTEL business accounts can manage room types.", 403)

    room_ref = db.collection("users").document(uid).collection("room_types").document(room_id)
    room_doc = room_ref.get()
    if not room_doc.exists:
        return error_response("NOT_FOUND", "Room type not found.", 404)

    payload["updated_at"] = datetime.utcnow().isoformat()
    room_ref.set(payload, merge=True)
    updated = room_ref.get().to_dict() or {}
    updated["id"] = room_id
    return success_response(updated, 200, "Room type updated successfully.")


@business_bp.route("/hotel/rooms/<room_id>", methods=["DELETE"])
@require_auth
@require_role(BUSINESS_ROLE)
def delete_hotel_business_room_type(room_id):
    """Delete a room type for a BUSINESS user with HOTEL subtype."""
    db = get_firestore_client()
    uid = g.current_user["uid"]
    user_data = _require_hotel_business_user(db, uid)
    if not user_data:
        return error_response("INVALID_ROLE", "Only HOTEL business accounts can manage room types.", 403)

    room_ref = db.collection("users").document(uid).collection("room_types").document(room_id)
    room_doc = room_ref.get()
    if not room_doc.exists:
        return error_response("NOT_FOUND", "Room type not found.", 404)

    room_ref.delete()
    return success_response({"id": room_id}, 200, "Room type deleted successfully.")
