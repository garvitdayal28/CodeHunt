"""
Bookings Blueprint — Itineraries, hotel bookings, and activity bookings.
"""

from datetime import datetime

from flask import Blueprint, g, request

from app.services.firebase_service import get_firestore_client
from app.utils.auth import require_auth, require_role
from app.utils.responses import error_response, success_response

bookings_bp = Blueprint("bookings", __name__, url_prefix="/api")

DATE_FMT = "%Y-%m-%d"
BOOKED_STATUSES = {"CONFIRMED", "LATE_ARRIVAL", "CHECKED_IN"}


def _parse_date(value):
    try:
        return datetime.strptime(str(value), DATE_FMT).date()
    except (TypeError, ValueError):
        return None


def _to_int(value, fallback=0):
    try:
        return int(value)
    except (TypeError, ValueError):
        return fallback


def _to_float(value, fallback=0.0):
    try:
        return float(value)
    except (TypeError, ValueError):
        return fallback


def _dates_overlap(check_in_a, check_out_a, check_in_b, check_out_b):
    # Treat checkout as exclusive for booking overlap checks.
    return check_in_a < check_out_b and check_in_b < check_out_a


def _extract_itinerary_id(doc):
    parent = doc.reference.parent.parent
    return parent.id if parent else None


def _get_itinerary_for_traveler(db, itinerary_id, traveler_uid):
    itinerary_ref = db.collection("itineraries").document(itinerary_id)
    itinerary_doc = itinerary_ref.get()
    if not itinerary_doc.exists:
        return None, error_response("NOT_FOUND", "Itinerary not found.", 404)

    itinerary_data = itinerary_doc.to_dict() or {}
    if itinerary_data.get("traveler_uid") != traveler_uid:
        return None, error_response("FORBIDDEN", "You can only book into your own itinerary.", 403)

    return itinerary_doc, None


def _calculate_overlapping_booked_rooms(db, hotel_owner_uid, room_type_id, check_in_date, check_out_date):
    booked_rooms = 0
    for itinerary_doc in db.collection("itineraries").stream():
        itinerary_id = itinerary_doc.id
        for booking_doc in db.collection("itineraries").document(itinerary_id).collection("bookings").stream():
            booking = booking_doc.to_dict() or {}
            if booking.get("hotel_owner_uid") != hotel_owner_uid:
                continue
            if booking.get("room_type_id") != room_type_id:
                continue
            if booking.get("status") not in BOOKED_STATUSES:
                continue

            existing_check_in = _parse_date(booking.get("check_in_date"))
            existing_check_out = _parse_date(booking.get("check_out_date"))
            if not existing_check_in or not existing_check_out:
                continue

            if _dates_overlap(existing_check_in, existing_check_out, check_in_date, check_out_date):
                booked_rooms += _to_int(booking.get("rooms_booked"), 1)

    return booked_rooms


# ----------------------------------------
# Itineraries
# ----------------------------------------


@bookings_bp.route("/itineraries", methods=["GET"])
@require_auth
@require_role("TRAVELER", "PLATFORM_ADMIN")
def get_itineraries():
    """Get all itineraries for the logged-in traveler."""
    db = get_firestore_client()
    uid = g.current_user["uid"]

    query = db.collection("itineraries").where("traveler_uid", "==", uid)
    docs = query.stream()

    itineraries = []
    for doc in docs:
        data = doc.to_dict()
        data["id"] = doc.id
        itineraries.append(data)

    return success_response(itineraries)


@bookings_bp.route("/itineraries", methods=["POST"])
@require_auth
@require_role("TRAVELER")
def create_itinerary():
    """Create a new itinerary."""
    data = request.get_json()
    if not data:
        return error_response("INVALID_BODY", "Request body must be JSON.", 400)

    destination = data.get("destination")
    start_date = data.get("start_date")
    end_date = data.get("end_date")

    if not destination or not start_date or not end_date:
        return error_response("MISSING_FIELDS", "destination, start_date, and end_date are required.", 400)

    db = get_firestore_client()
    uid = g.current_user["uid"]

    itinerary_data = {
        "traveler_uid": uid,
        "traveler_name": g.current_user["claims"].get("name", ""),
        "destination": destination,
        "start_date": start_date,
        "end_date": end_date,
        "status": "DRAFT",
        "created_at": datetime.utcnow().isoformat(),
        "updated_at": datetime.utcnow().isoformat(),
    }

    doc_ref = db.collection("itineraries").add(itinerary_data)
    itinerary_data["id"] = doc_ref[1].id

    return success_response(itinerary_data, 201, "Itinerary created.")


@bookings_bp.route("/itineraries/<itinerary_id>", methods=["GET"])
@require_auth
@require_role("TRAVELER", "PLATFORM_ADMIN")
def get_itinerary(itinerary_id):
    """Get a full itinerary with all linked bookings and activities."""
    db = get_firestore_client()

    doc = db.collection("itineraries").document(itinerary_id).get()
    if not doc.exists:
        return error_response("NOT_FOUND", "Itinerary not found.", 404)

    itinerary = doc.to_dict()
    itinerary["id"] = doc.id

    bookings = []
    for booking_doc in db.collection("itineraries").document(itinerary_id).collection("bookings").stream():
        booking = booking_doc.to_dict()
        booking["id"] = booking_doc.id
        bookings.append(booking)

    activities = []
    for activity_doc in db.collection("itineraries").document(itinerary_id).collection("activities").stream():
        activity = activity_doc.to_dict()
        activity["id"] = activity_doc.id
        activities.append(activity)

    itinerary["bookings"] = bookings
    itinerary["activities"] = activities

    return success_response(itinerary)


# ----------------------------------------
# Hotel Bookings
# ----------------------------------------


@bookings_bp.route("/bookings", methods=["POST"])
@require_auth
@require_role("TRAVELER")
def create_booking():
    """Create a hotel booking, optionally linked to an itinerary."""
    data = request.get_json()
    if not data:
        return error_response("INVALID_BODY", "Request body must be JSON.", 400)

    itinerary_id = data.get("itinerary_id")

    check_in_raw = data.get("check_in_date")
    check_out_raw = data.get("check_out_date")
    if not check_in_raw or not check_out_raw:
        return error_response("MISSING_FIELDS", "check_in_date and check_out_date are required.", 400)

    check_in_date = _parse_date(check_in_raw)
    check_out_date = _parse_date(check_out_raw)
    if not check_in_date or not check_out_date:
        return error_response("INVALID_DATES", "check_in_date and check_out_date must be in YYYY-MM-DD format.", 400)
    if check_out_date <= check_in_date:
        return error_response("INVALID_DATES", "check_out_date must be after check_in_date.", 400)

    db = get_firestore_client()
    uid = g.current_user["uid"]
    traveler_name = g.current_user["claims"].get("name", "")

    if itinerary_id:
        _, itinerary_error = _get_itinerary_for_traveler(db, itinerary_id, uid)
        if itinerary_error:
            return itinerary_error

    hotel_owner_uid = str(data.get("hotel_owner_uid") or "").strip()
    room_type_id = str(data.get("room_type_id") or "").strip()
    using_internal_hotel_flow = bool(hotel_owner_uid or room_type_id)
    now_iso = datetime.utcnow().isoformat()
    nights = (check_out_date - check_in_date).days

    if using_internal_hotel_flow:
        if not hotel_owner_uid or not room_type_id:
            return error_response("MISSING_FIELDS", "hotel_owner_uid and room_type_id are required.", 400)

        if "rooms_booked" not in data or "adults" not in data or "children" not in data:
            return error_response("MISSING_FIELDS", "rooms_booked, adults and children are required.", 400)

        rooms_booked = _to_int(data.get("rooms_booked"), 0)
        adults = _to_int(data.get("adults"), -1)
        children = _to_int(data.get("children"), -1)
        if rooms_booked < 1:
            return error_response("INVALID_BOOKING", "rooms_booked must be at least 1.", 400)
        if adults < 0 or children < 0:
            return error_response("INVALID_BOOKING", "adults and children must be non-negative integers.", 400)

        room_ref = db.collection("users").document(hotel_owner_uid).collection("room_types").document(room_type_id)
        room_doc = room_ref.get()
        if not room_doc.exists:
            return error_response("NOT_FOUND", "Selected room type does not exist.", 404)

        room_data = room_doc.to_dict() or {}
        total_rooms = _to_int(room_data.get("total_rooms"), 0)
        if total_rooms < 1:
            return error_response("INVALID_ROOM", "Room type has invalid inventory.", 400)

        max_guests = _to_int(room_data.get("max_guests"), max(2, _to_int(room_data.get("beds"), 1) * 2))
        if adults + children > max_guests * rooms_booked:
            return error_response("INVALID_BOOKING", "Guest count exceeds room capacity for selected quantity.", 400)

        overlapping_booked_rooms = _calculate_overlapping_booked_rooms(
            db,
            hotel_owner_uid,
            room_type_id,
            check_in_date,
            check_out_date,
        )
        available_rooms = max(0, total_rooms - overlapping_booked_rooms)
        if rooms_booked > available_rooms:
            return error_response(
                "INSUFFICIENT_AVAILABILITY",
                f"Only {available_rooms} room(s) are available for selected dates.",
                409,
            )

        business_doc = db.collection("users").document(hotel_owner_uid).get()
        business_data = business_doc.to_dict() if business_doc.exists else {}
        business_profile = (business_data or {}).get("business_profile") or {}
        property_name = (
            str(data.get("property_name") or "").strip()
            or business_profile.get("business_name")
            or business_data.get("display_name")
            or "Hotel"
        )

        room_type_name = str(room_data.get("name") or "").strip() or str(data.get("room_type") or "").strip() or "Room"
        price_per_day = _to_float(room_data.get("price_per_day"), 0.0)
        total_price = round(price_per_day * nights * rooms_booked, 2)

        booking_data = {
            "traveler_uid": uid,
            "traveler_name": traveler_name,
            "hotel_owner_uid": hotel_owner_uid,
            "property_id": str(data.get("property_id") or hotel_owner_uid),
            "property_name": property_name,
            "room_type_id": room_type_id,
            "room_type": room_type_name,
            "rooms_booked": rooms_booked,
            "adults": adults,
            "children": children,
            "guest_count": adults + children,
            "check_in_date": check_in_raw,
            "check_out_date": check_out_raw,
            "price_per_day": price_per_day,
            "nights": nights,
            "total_price": total_price,
            "status": "CONFIRMED",
            "created_at": now_iso,
            "updated_at": now_iso,
        }
        if itinerary_id:
            booking_data["itinerary_id"] = itinerary_id
    else:
        required_legacy = ["property_id", "room_type"]
        for field in required_legacy:
            if field not in data:
                return error_response("MISSING_FIELDS", f"{field} is required.", 400)

        booking_data = {
            "traveler_uid": uid,
            "traveler_name": traveler_name,
            "property_id": data["property_id"],
            "property_name": data.get("property_name", ""),
            "room_type": data["room_type"],
            "check_in_date": check_in_raw,
            "check_out_date": check_out_raw,
            "rooms_booked": _to_int(data.get("rooms_booked"), 1),
            "adults": _to_int(data.get("adults"), 2),
            "children": _to_int(data.get("children"), 0),
            "status": "CONFIRMED",
            "created_at": now_iso,
            "updated_at": now_iso,
        }
        if itinerary_id:
            booking_data["itinerary_id"] = itinerary_id

    if itinerary_id:
        doc_ref = (
            db.collection("itineraries")
            .document(itinerary_id)
            .collection("bookings")
            .add(booking_data)
        )
        booking_data["id"] = doc_ref[1].id
    else:
        doc_ref = db.collection("bookings").add(booking_data)
        booking_data["id"] = doc_ref[1].id

    db.collection("activity_log").add(
        {
            "actor_uid": uid,
            "actor_role": g.current_user["role"],
            "action": "BOOKING_CREATED",
            "resource_type": "booking",
            "resource_id": booking_data["id"],
            "timestamp": datetime.utcnow().isoformat(),
            "changes": {"after": booking_data},
        }
    )

    return success_response(booking_data, 201, "Booking created.")


@bookings_bp.route("/bookings/hotels/me", methods=["GET"])
@require_auth
@require_role("TRAVELER", "PLATFORM_ADMIN")
def get_my_hotel_bookings():
    """Return the logged-in traveler's hotel bookings across all itineraries and standalone."""
    db = get_firestore_client()
    uid = g.current_user["uid"]

    itinerary_cache = {}
    bookings = []

    for itinerary_doc in db.collection("itineraries").where("traveler_uid", "==", uid).stream():
        itinerary_id = itinerary_doc.id
        itinerary = itinerary_doc.to_dict() or {}
        itinerary_cache[itinerary_id] = itinerary

        for booking_doc in db.collection("itineraries").document(itinerary_id).collection("bookings").stream():
            booking = booking_doc.to_dict() or {}
            booking["id"] = booking_doc.id
            booking["itinerary_id"] = itinerary_id
            booking["destination"] = itinerary.get("destination")
            booking["itinerary_start_date"] = itinerary.get("start_date")
            booking["itinerary_end_date"] = itinerary.get("end_date")
            bookings.append(booking)

    for booking_doc in db.collection("bookings").where("traveler_uid", "==", uid).stream():
        booking = booking_doc.to_dict() or {}
        booking["id"] = booking_doc.id
        bookings.append(booking)

    bookings.sort(
        key=lambda item: (
            item.get("check_in_date") or "",
            item.get("created_at") or "",
        ),
        reverse=True,
    )
    return success_response(bookings)


# ----------------------------------------
# Activity Bookings
# ----------------------------------------


@bookings_bp.route("/activities", methods=["POST"])
@require_auth
@require_role("TRAVELER")
def create_activity():
    """Add an activity booking to an itinerary."""
    data = request.get_json()
    if not data:
        return error_response("INVALID_BODY", "Request body must be JSON.", 400)

    required = ["itinerary_id", "tour_id", "time_slot_id", "scheduled_time"]
    for field in required:
        if field not in data:
            return error_response("MISSING_FIELDS", f"{field} is required.", 400)

    db = get_firestore_client()
    uid = g.current_user["uid"]

    activity_data = {
        "traveler_uid": uid,
        "traveler_name": g.current_user["claims"].get("name", ""),
        "tour_id": data["tour_id"],
        "tour_name": data.get("tour_name", ""),
        "time_slot_id": data["time_slot_id"],
        "scheduled_time": data["scheduled_time"],
        "status": "UPCOMING",
        "created_at": datetime.utcnow().isoformat(),
    }

    doc_ref = (
        db.collection("itineraries")
        .document(data["itinerary_id"])
        .collection("activities")
        .add(activity_data)
    )
    activity_data["id"] = doc_ref[1].id

    db.collection("activity_log").add(
        {
            "actor_uid": uid,
            "actor_role": g.current_user["role"],
            "action": "ACTIVITY_BOOKED",
            "resource_type": "activity",
            "resource_id": activity_data["id"],
            "timestamp": datetime.utcnow().isoformat(),
            "changes": {"after": activity_data},
        }
    )

    return success_response(activity_data, 201, "Activity booked.")
