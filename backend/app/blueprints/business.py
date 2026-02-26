"""
Business Blueprint - business profile retrieval and updates.
"""

from datetime import datetime

from flask import Blueprint, g, request

from app.services.cloudinary_service import upload_image
from app.services.firebase_service import get_firestore_client
from app.services.redis_service import cache_delete_prefix
from app.utils.auth import require_auth, require_role
from app.utils.business_profile import BUSINESS_ROLE, validate_and_normalize_business_profile
from app.utils.responses import error_response, success_response

business_bp = Blueprint("business", __name__, url_prefix="/api/business")

GUIDE_SERVICE_TYPES = {"ACTIVITY", "GUIDED_TOUR"}
GUIDE_PRICE_UNITS = {"PER_PERSON", "PER_GROUP"}
GUIDE_DIFFICULTY_LEVELS = {"EASY", "MODERATE", "HARD"}


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


def _require_restaurant_business_user(db, uid):
    user_doc = db.collection("users").document(uid).get()
    if not user_doc.exists:
        return None
    user_data = user_doc.to_dict() or {}
    if user_data.get("role") != BUSINESS_ROLE:
        return None
    business_profile = user_data.get("business_profile") or {}
    if business_profile.get("business_type") != "RESTAURANT":
        return None
    return user_data


def _require_guide_business_user(db, uid):
    user_doc = db.collection("users").document(uid).get()
    if not user_doc.exists:
        return None
    user_data = user_doc.to_dict() or {}
    if user_data.get("role") != BUSINESS_ROLE:
        return None
    business_profile = user_data.get("business_profile") or {}
    if business_profile.get("business_type") != "TOURIST_GUIDE_SERVICE":
        return None
    return user_data


def _to_string_list(value):
    if isinstance(value, str):
        return [item.strip() for item in value.split(",") if item.strip()]
    if isinstance(value, list):
        return [str(item).strip() for item in value if str(item).strip()]
    return []


def _parse_date(value):
    if not value:
        return None
    try:
        return datetime.strptime(str(value), "%Y-%m-%d").date()
    except (TypeError, ValueError):
        return None


def _extract_itinerary_id(doc):
    parent = doc.reference.parent.parent
    return parent.id if parent else None


def _to_bool(value, field_name, default=True):
    if value is None:
        return default
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return bool(value)
    if isinstance(value, str):
        normalized = value.strip().lower()
        if normalized in {"true", "1", "yes", "y", "on"}:
            return True
        if normalized in {"false", "0", "no", "n", "off"}:
            return False
    raise ValueError(f"{field_name} must be a boolean.")


def _parse_positive_float(value, field_name):
    try:
        parsed = float(value)
    except (TypeError, ValueError):
        raise ValueError(f"{field_name} must be a positive number.")
    if parsed <= 0:
        raise ValueError(f"{field_name} must be a positive number.")
    return parsed


def _parse_non_negative_float(value, field_name):
    try:
        parsed = float(value)
    except (TypeError, ValueError):
        raise ValueError(f"{field_name} must be a non-negative number.")
    if parsed < 0:
        raise ValueError(f"{field_name} must be a non-negative number.")
    return parsed


def _parse_optional_positive_int(value, field_name):
    if value is None or str(value).strip() == "":
        return None
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        raise ValueError(f"{field_name} must be a positive integer.")
    if parsed <= 0:
        raise ValueError(f"{field_name} must be a positive integer.")
    return parsed


def _parse_optional_non_negative_int(value, field_name):
    if value is None or str(value).strip() == "":
        return None
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        raise ValueError(f"{field_name} must be a non-negative integer.")
    if parsed < 0:
        raise ValueError(f"{field_name} must be a non-negative integer.")
    return parsed


def _normalize_guide_service_payload(data):
    if not isinstance(data, dict):
        raise ValueError("Request body must be a JSON object.")

    service_type = str(data.get("service_type") or "").strip().upper()
    if service_type not in GUIDE_SERVICE_TYPES:
        raise ValueError("service_type must be ACTIVITY or GUIDED_TOUR.")

    name = str(data.get("name") or "").strip()
    if not name:
        raise ValueError("name is required.")

    location = str(data.get("location") or "").strip()
    if not location:
        raise ValueError("location is required.")

    duration_hours = _parse_positive_float(data.get("duration_hours"), "duration_hours")
    price = _parse_non_negative_float(data.get("price"), "price")

    price_unit = str(data.get("price_unit") or "PER_PERSON").strip().upper()
    if price_unit not in GUIDE_PRICE_UNITS:
        raise ValueError("price_unit must be PER_PERSON or PER_GROUP.")

    max_group_size = _parse_optional_positive_int(data.get("max_group_size"), "max_group_size")
    category = _to_string_list(data.get("category"))
    highlights = _to_string_list(data.get("highlights"))
    inclusions = _to_string_list(data.get("inclusions"))

    images = data.get("images")
    if images is None:
        image_urls = []
    elif isinstance(images, list):
        image_urls = [str(url).strip() for url in images if str(url).strip()]
    else:
        raise ValueError("images must be a list of URLs.")

    payload = {
        "service_type": service_type,
        "name": name,
        "description": str(data.get("description") or "").strip(),
        "location": location,
        "duration_hours": duration_hours,
        "price": price,
        "price_unit": price_unit,
        "max_group_size": max_group_size,
        "category": category,
        "highlights": highlights,
        "inclusions": inclusions,
        "images": image_urls,
        "cover_image": image_urls[0] if image_urls else None,
        "is_active": _to_bool(data.get("is_active"), "is_active", default=True),
    }

    if service_type == "ACTIVITY":
        difficulty_level = str(data.get("difficulty_level") or "EASY").strip().upper()
        if difficulty_level not in GUIDE_DIFFICULTY_LEVELS:
            raise ValueError("difficulty_level must be EASY, MODERATE, or HARD.")
        payload["difficulty_level"] = difficulty_level
        payload["min_age"] = _parse_optional_non_negative_int(data.get("min_age"), "min_age")
        payload["meeting_point"] = ""
        payload["languages"] = []
    else:
        payload["meeting_point"] = str(data.get("meeting_point") or "").strip()
        payload["languages"] = _to_string_list(data.get("languages"))
        payload["difficulty_level"] = None
        payload["min_age"] = None

    return payload


def _invalidate_tours_cache():
    cache_delete_prefix("tours:")


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


@business_bp.route("/restaurant/upload-image", methods=["POST"])
@require_auth
@require_role(BUSINESS_ROLE)
def upload_restaurant_business_image():
    """Upload a restaurant image for BUSINESS users with RESTAURANT subtype."""
    db = get_firestore_client()
    uid = g.current_user["uid"]
    user_data = _require_restaurant_business_user(db, uid)
    if not user_data:
        return error_response("INVALID_ROLE", "Only RESTAURANT business accounts can upload restaurant images.", 403)

    file_obj = request.files.get("file")
    if not file_obj:
        return error_response("MISSING_FILE", "file is required as multipart form-data.", 400)

    folder = request.form.get("folder") or f"tripallied/business/{uid}/restaurant"
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


@business_bp.route("/hotel/bookings", methods=["GET"])
@require_auth
@require_role(BUSINESS_ROLE)
def get_hotel_business_bookings():
    """List hotel bookings for the authenticated BUSINESS/HOTEL user."""
    db = get_firestore_client()
    uid = g.current_user["uid"]
    user_data = _require_hotel_business_user(db, uid)
    if not user_data:
        return error_response("INVALID_ROLE", "Only HOTEL business accounts can access hotel bookings.", 403)

    status_filter = str(request.args.get("status") or "").strip().upper()
    checkin_from_raw = request.args.get("checkin_from")
    checkout_to_raw = request.args.get("checkout_to")
    checkin_from = _parse_date(checkin_from_raw)
    checkout_to = _parse_date(checkout_to_raw)

    if checkin_from_raw and not checkin_from:
        return error_response("INVALID_DATES", "checkin_from must be in YYYY-MM-DD format.", 400)
    if checkout_to_raw and not checkout_to:
        return error_response("INVALID_DATES", "checkout_to must be in YYYY-MM-DD format.", 400)
    if checkin_from and checkout_to and checkout_to < checkin_from:
        return error_response("INVALID_DATES", "checkout_to must be greater than or equal to checkin_from.", 400)

    bookings = []
    for itinerary_doc in db.collection("itineraries").stream():
        itinerary_id = itinerary_doc.id
        for booking_doc in db.collection("itineraries").document(itinerary_id).collection("bookings").stream():
            booking = booking_doc.to_dict() or {}
            if booking.get("hotel_owner_uid") != uid:
                continue
            if status_filter and str(booking.get("status") or "").upper() != status_filter:
                continue

            booking_checkin = _parse_date(booking.get("check_in_date"))
            booking_checkout = _parse_date(booking.get("check_out_date"))
            if checkin_from and booking_checkin and booking_checkin < checkin_from:
                continue
            if checkout_to and booking_checkout and booking_checkout > checkout_to:
                continue

            booking["id"] = booking_doc.id
            booking["itinerary_id"] = itinerary_id
            bookings.append(booking)

    bookings.sort(
        key=lambda item: (
            item.get("check_in_date") or "",
            item.get("created_at") or "",
        )
    )
    return success_response(bookings)


@business_bp.route("/hotel/bookings/<itinerary_id>/<booking_id>/status", methods=["PATCH"])
@require_auth
@require_role(BUSINESS_ROLE)
def update_hotel_business_booking_status(itinerary_id, booking_id):
    """Update booking status with strict operational transitions for BUSINESS/HOTEL users."""
    data = request.get_json()
    if not data or not isinstance(data, dict):
        return error_response("INVALID_BODY", "Request body must be a JSON object.", 400)

    new_status = str(data.get("status") or "").strip().upper()
    if new_status not in {"CHECKED_IN", "CHECKED_OUT"}:
        return error_response("INVALID_STATUS", "status must be CHECKED_IN or CHECKED_OUT.", 400)

    db = get_firestore_client()
    uid = g.current_user["uid"]
    user_data = _require_hotel_business_user(db, uid)
    if not user_data:
        return error_response("INVALID_ROLE", "Only HOTEL business accounts can update booking status.", 403)

    booking_ref = db.collection("itineraries").document(itinerary_id).collection("bookings").document(booking_id)
    booking_doc = booking_ref.get()
    if not booking_doc.exists:
        return error_response("NOT_FOUND", "Booking not found.", 404)

    booking = booking_doc.to_dict() or {}
    if booking.get("hotel_owner_uid") != uid:
        return error_response("FORBIDDEN", "You can only update bookings for your own hotel.", 403)

    current_status = str(booking.get("status") or "").upper()
    valid_transitions = {
        "CHECKED_IN": {"CONFIRMED", "LATE_ARRIVAL"},
        "CHECKED_OUT": {"CHECKED_IN"},
    }
    if current_status not in valid_transitions[new_status]:
        return error_response(
            "INVALID_TRANSITION",
            f"Cannot move booking from {current_status or 'UNKNOWN'} to {new_status}.",
            400,
        )

    booking_ref.set(
        {
            "status": new_status,
            "updated_at": datetime.utcnow().isoformat(),
        },
        merge=True,
    )

    updated = booking_ref.get().to_dict() or {}
    updated["id"] = booking_id
    updated["itinerary_id"] = itinerary_id
    return success_response(updated, 200, f"Booking marked as {new_status}.")


# ─── Restaurant Menu Management ────────────────────────────────────────────────


def _normalize_menu_item_payload(data, partial=False):
    """Validate and normalize a menu item payload."""
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

    if "price" in data or not partial:
        try:
            price = float(data.get("price"))
            if price < 0:
                raise ValueError
        except (TypeError, ValueError):
            raise ValueError("price must be a non-negative number.")
        payload["price"] = price

    if "is_veg" in data:
        payload["is_veg"] = bool(data.get("is_veg"))
    elif not partial:
        payload["is_veg"] = True

    if "servings" in data:
        payload["servings"] = str(data.get("servings") or "").strip()
    elif not partial:
        payload["servings"] = ""

    if "category" in data:
        payload["category"] = str(data.get("category") or "").strip()
    elif not partial:
        payload["category"] = ""

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

    if "is_available" in data:
        payload["is_available"] = bool(data.get("is_available"))
    elif not partial:
        payload["is_available"] = True

    return payload


@business_bp.route("/restaurant/menu", methods=["GET"])
@require_auth
@require_role(BUSINESS_ROLE)
def get_restaurant_menu_items():
    """List menu items for a BUSINESS user with RESTAURANT subtype."""
    db = get_firestore_client()
    uid = g.current_user["uid"]
    user_data = _require_restaurant_business_user(db, uid)
    if not user_data:
        return error_response("INVALID_ROLE", "Only RESTAURANT business accounts can manage menu items.", 403)

    items = []
    for doc in db.collection("users").document(uid).collection("menu_items").stream():
        item = doc.to_dict() or {}
        item["id"] = doc.id
        items.append(item)

    items.sort(key=lambda item: item.get("created_at", ""), reverse=True)
    return success_response(items)


@business_bp.route("/restaurant/menu", methods=["POST"])
@require_auth
@require_role(BUSINESS_ROLE)
def create_restaurant_menu_item():
    """Create a menu item for a BUSINESS user with RESTAURANT subtype."""
    data = request.get_json()
    if not data:
        return error_response("INVALID_BODY", "Request body must be a JSON object.", 400)

    try:
        payload = _normalize_menu_item_payload(data, partial=False)
    except ValueError as e:
        return error_response("INVALID_MENU_DATA", str(e), 400)

    db = get_firestore_client()
    uid = g.current_user["uid"]
    user_data = _require_restaurant_business_user(db, uid)
    if not user_data:
        return error_response("INVALID_ROLE", "Only RESTAURANT business accounts can manage menu items.", 403)

    now_iso = datetime.utcnow().isoformat()
    payload["created_at"] = now_iso
    payload["updated_at"] = now_iso

    item_ref = db.collection("users").document(uid).collection("menu_items").document()
    item_ref.set(payload)
    created = item_ref.get().to_dict() or {}
    created["id"] = item_ref.id
    return success_response(created, 201, "Menu item created successfully.")


@business_bp.route("/restaurant/menu/<item_id>", methods=["PUT"])
@require_auth
@require_role(BUSINESS_ROLE)
def update_restaurant_menu_item(item_id):
    """Update a menu item for a BUSINESS user with RESTAURANT subtype."""
    data = request.get_json()
    if not data:
        return error_response("INVALID_BODY", "Request body must be a JSON object.", 400)

    try:
        payload = _normalize_menu_item_payload(data, partial=True)
    except ValueError as e:
        return error_response("INVALID_MENU_DATA", str(e), 400)

    if not payload:
        return error_response("NO_FIELDS", "No menu item fields provided.", 400)

    db = get_firestore_client()
    uid = g.current_user["uid"]
    user_data = _require_restaurant_business_user(db, uid)
    if not user_data:
        return error_response("INVALID_ROLE", "Only RESTAURANT business accounts can manage menu items.", 403)

    item_ref = db.collection("users").document(uid).collection("menu_items").document(item_id)
    item_doc = item_ref.get()
    if not item_doc.exists:
        return error_response("NOT_FOUND", "Menu item not found.", 404)

    payload["updated_at"] = datetime.utcnow().isoformat()
    item_ref.set(payload, merge=True)
    updated = item_ref.get().to_dict() or {}
    updated["id"] = item_id
    return success_response(updated, 200, "Menu item updated successfully.")


@business_bp.route("/restaurant/menu/<item_id>", methods=["DELETE"])
@require_auth
@require_role(BUSINESS_ROLE)
def delete_restaurant_menu_item(item_id):
    """Delete a menu item for a BUSINESS user with RESTAURANT subtype."""
    db = get_firestore_client()
    uid = g.current_user["uid"]
    user_data = _require_restaurant_business_user(db, uid)
    if not user_data:
        return error_response("INVALID_ROLE", "Only RESTAURANT business accounts can manage menu items.", 403)

    item_ref = db.collection("users").document(uid).collection("menu_items").document(item_id)
    item_doc = item_ref.get()
    if not item_doc.exists:
        return error_response("NOT_FOUND", "Menu item not found.", 404)

    item_ref.delete()
    return success_response({"id": item_id}, 200, "Menu item deleted successfully.")


@business_bp.route("/guide/upload-image", methods=["POST"])
@require_auth
@require_role(BUSINESS_ROLE)
def upload_guide_service_image():
    """Upload an image for TOURIST_GUIDE_SERVICE business accounts."""
    db = get_firestore_client()
    uid = g.current_user["uid"]
    user_data = _require_guide_business_user(db, uid)
    if not user_data:
        return error_response("INVALID_ROLE", "Only TOURIST_GUIDE_SERVICE accounts can upload guide images.", 403)

    file_obj = request.files.get("file")
    if not file_obj:
        return error_response("MISSING_FILE", "file is required as multipart form-data.", 400)

    folder = request.form.get("folder") or f"tripallied/business/{uid}/guide-services"
    try:
        uploaded = upload_image(file_obj, folder=folder)
    except ValueError as e:
        return error_response("UPLOAD_CONFIG_ERROR", str(e), 400)
    except RuntimeError as e:
        return error_response("UPLOAD_FAILED", str(e), 502)
    except Exception as e:
        return error_response("UPLOAD_FAILED", f"Unexpected upload error: {e}", 500)

    return success_response(uploaded, 200, "Image uploaded successfully.")


@business_bp.route("/guide/services", methods=["GET"])
@require_auth
@require_role(BUSINESS_ROLE)
def get_guide_services():
    """List guide services for a TOURIST_GUIDE_SERVICE business account."""
    db = get_firestore_client()
    uid = g.current_user["uid"]
    user_data = _require_guide_business_user(db, uid)
    if not user_data:
        return error_response("INVALID_ROLE", "Only TOURIST_GUIDE_SERVICE accounts can manage services.", 403)

    items = []
    for doc in db.collection("users").document(uid).collection("guide_services").stream():
        item = doc.to_dict() or {}
        item["id"] = item.get("id") or doc.id
        items.append(item)

    items.sort(key=lambda item: item.get("created_at", ""), reverse=True)
    return success_response(items)


@business_bp.route("/guide/services", methods=["POST"])
@require_auth
@require_role(BUSINESS_ROLE)
def create_guide_service():
    """Create a guide service package for a TOURIST_GUIDE_SERVICE business account."""
    data = request.get_json()
    if not data or not isinstance(data, dict):
        return error_response("INVALID_BODY", "Request body must be a JSON object.", 400)

    try:
        payload = _normalize_guide_service_payload(data)
    except ValueError as e:
        return error_response("INVALID_SERVICE_DATA", str(e), 400)

    db = get_firestore_client()
    uid = g.current_user["uid"]
    user_data = _require_guide_business_user(db, uid)
    if not user_data:
        return error_response("INVALID_ROLE", "Only TOURIST_GUIDE_SERVICE accounts can manage services.", 403)

    business_profile = user_data.get("business_profile") or {}
    now_iso = datetime.utcnow().isoformat()
    service_ref = db.collection("users").document(uid).collection("guide_services").document()

    payload.update(
        {
            "id": service_ref.id,
            "owner_uid": uid,
            "owner_display_name": user_data.get("display_name") or "",
            "business_name": business_profile.get("business_name") or user_data.get("display_name") or "",
            "business_city": business_profile.get("city") or "",
            "source": "GUIDE_SERVICE",
            "created_at": now_iso,
            "updated_at": now_iso,
        }
    )

    service_ref.set(payload)
    _invalidate_tours_cache()
    return success_response(payload, 201, "Guide service created successfully.")


@business_bp.route("/guide/services/<service_id>", methods=["PUT"])
@require_auth
@require_role(BUSINESS_ROLE)
def update_guide_service(service_id):
    """Update a guide service package for a TOURIST_GUIDE_SERVICE business account."""
    data = request.get_json()
    if not data or not isinstance(data, dict):
        return error_response("INVALID_BODY", "Request body must be a JSON object.", 400)

    db = get_firestore_client()
    uid = g.current_user["uid"]
    user_data = _require_guide_business_user(db, uid)
    if not user_data:
        return error_response("INVALID_ROLE", "Only TOURIST_GUIDE_SERVICE accounts can manage services.", 403)

    service_ref = db.collection("users").document(uid).collection("guide_services").document(service_id)
    service_doc = service_ref.get()
    if not service_doc.exists:
        return error_response("NOT_FOUND", "Guide service not found.", 404)

    existing = service_doc.to_dict() or {}
    merged = {**existing, **data}
    try:
        payload = _normalize_guide_service_payload(merged)
    except ValueError as e:
        return error_response("INVALID_SERVICE_DATA", str(e), 400)

    business_profile = user_data.get("business_profile") or {}
    payload.update(
        {
            "id": service_id,
            "owner_uid": uid,
            "owner_display_name": user_data.get("display_name") or "",
            "business_name": business_profile.get("business_name") or user_data.get("display_name") or "",
            "business_city": business_profile.get("city") or "",
            "source": "GUIDE_SERVICE",
            "created_at": existing.get("created_at") or datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
        }
    )

    service_ref.set(payload)
    _invalidate_tours_cache()
    return success_response(payload, 200, "Guide service updated successfully.")


@business_bp.route("/guide/services/<service_id>", methods=["DELETE"])
@require_auth
@require_role(BUSINESS_ROLE)
def delete_guide_service(service_id):
    """Delete a guide service package for a TOURIST_GUIDE_SERVICE business account."""
    db = get_firestore_client()
    uid = g.current_user["uid"]
    user_data = _require_guide_business_user(db, uid)
    if not user_data:
        return error_response("INVALID_ROLE", "Only TOURIST_GUIDE_SERVICE accounts can manage services.", 403)

    service_ref = db.collection("users").document(uid).collection("guide_services").document(service_id)
    service_doc = service_ref.get()
    if not service_doc.exists:
        return error_response("NOT_FOUND", "Guide service not found.", 404)

    service_ref.delete()
    _invalidate_tours_cache()
    return success_response({"id": service_id}, 200, "Guide service deleted successfully.")
