"""
Bookings Blueprint — Itineraries, hotel bookings, and activity bookings.
"""

from flask import Blueprint, request, g
from app.utils.auth import require_auth, require_role
from app.utils.responses import success_response, error_response
from app.services.firebase_service import get_firestore_client
from datetime import datetime

bookings_bp = Blueprint("bookings", __name__, url_prefix="/api")


# ──────────────────────────────────────────────
# Itineraries
# ──────────────────────────────────────────────

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

    # Fetch bookings subcollection
    bookings = []
    for b in db.collection("itineraries").document(itinerary_id).collection("bookings").stream():
        booking = b.to_dict()
        booking["id"] = b.id
        bookings.append(booking)

    # Fetch activities subcollection
    activities = []
    for a in db.collection("itineraries").document(itinerary_id).collection("activities").stream():
        activity = a.to_dict()
        activity["id"] = a.id
        activities.append(activity)

    itinerary["bookings"] = bookings
    itinerary["activities"] = activities

    return success_response(itinerary)


# ──────────────────────────────────────────────
# Hotel Bookings
# ──────────────────────────────────────────────

@bookings_bp.route("/bookings", methods=["POST"])
@require_auth
@require_role("TRAVELER")
def create_booking():
    """Create a hotel booking linked to an itinerary."""
    data = request.get_json()
    if not data:
        return error_response("INVALID_BODY", "Request body must be JSON.", 400)

    required = ["itinerary_id", "property_id", "room_type", "check_in_date", "check_out_date"]
    for field in required:
        if field not in data:
            return error_response("MISSING_FIELDS", f"{field} is required.", 400)

    db = get_firestore_client()
    uid = g.current_user["uid"]

    booking_data = {
        "traveler_uid": uid,
        "traveler_name": g.current_user["claims"].get("name", ""),
        "property_id": data["property_id"],
        "property_name": data.get("property_name", ""),
        "room_type": data["room_type"],
        "check_in_date": data["check_in_date"],
        "check_out_date": data["check_out_date"],
        "status": "CONFIRMED",
        "created_at": datetime.utcnow().isoformat(),
    }

    # Write to itinerary's bookings subcollection
    doc_ref = (
        db.collection("itineraries")
        .document(data["itinerary_id"])
        .collection("bookings")
        .add(booking_data)
    )
    booking_data["id"] = doc_ref[1].id

    # Write audit log
    db.collection("activity_log").add({
        "actor_uid": uid,
        "actor_role": g.current_user["role"],
        "action": "BOOKING_CREATED",
        "resource_type": "booking",
        "resource_id": booking_data["id"],
        "timestamp": datetime.utcnow().isoformat(),
        "changes": {"after": booking_data},
    })

    return success_response(booking_data, 201, "Booking created.")


# ──────────────────────────────────────────────
# Activity Bookings
# ──────────────────────────────────────────────

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

    # Write audit log
    db.collection("activity_log").add({
        "actor_uid": uid,
        "actor_role": g.current_user["role"],
        "action": "ACTIVITY_BOOKED",
        "resource_type": "activity",
        "resource_id": activity_data["id"],
        "timestamp": datetime.utcnow().isoformat(),
        "changes": {"after": activity_data},
    })

    return success_response(activity_data, 201, "Activity booked.")
