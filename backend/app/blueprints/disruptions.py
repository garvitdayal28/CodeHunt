"""
Disruptions Blueprint — The flagship Disruption Engine.
Handles disruption reporting, cascading updates, and audit logging.
"""

from flask import Blueprint, request, g
from app.utils.auth import require_auth, require_role
from app.utils.responses import success_response, error_response
from app.services.firebase_service import get_firestore_client
from app.services.redis_service import publish_event
from datetime import datetime

disruptions_bp = Blueprint("disruptions", __name__, url_prefix="/api")

VALID_DISRUPTION_TYPES = [
    "FLIGHT_DELAY",
    "FLIGHT_CANCELLATION",
    "WEATHER_DISRUPTION",
    "PERSONAL_EMERGENCY",
    "OTHER",
]


@disruptions_bp.route("/itineraries/<itinerary_id>/disruption", methods=["PATCH"])
@require_auth
@require_role("TRAVELER", "PLATFORM_ADMIN")
def report_disruption(itinerary_id):
    """
    Report a disruption on an itinerary.
    Triggers the full cascade: update itinerary → bookings → activities → alerts → audit log → SSE.
    Uses a Firestore batch write for atomicity.
    """
    data = request.get_json()
    if not data:
        return error_response("INVALID_BODY", "Request body must be JSON.", 400)

    disruption_type = data.get("disruption_type")
    new_time = data.get("new_time")
    original_time = data.get("original_time")
    notes = data.get("notes", "")

    if not disruption_type or not new_time:
        return error_response("MISSING_FIELDS", "disruption_type and new_time are required.", 400)

    if disruption_type not in VALID_DISRUPTION_TYPES:
        return error_response("INVALID_TYPE", f"Must be one of: {', '.join(VALID_DISRUPTION_TYPES)}", 400)

    db = get_firestore_client()
    uid = g.current_user["uid"]

    # Fetch the itinerary
    itin_ref = db.collection("itineraries").document(itinerary_id)
    itin_doc = itin_ref.get()

    if not itin_doc.exists:
        return error_response("NOT_FOUND", "Itinerary not found.", 404)

    itin_data = itin_doc.to_dict()
    old_status = itin_data.get("status")

    # Start batch write
    batch = db.batch()
    cascaded_updates = []

    # 1. Update itinerary status
    batch.update(itin_ref, {
        "status": "DISRUPTED",
        "disruption_type": disruption_type,
        "new_arrival_time": new_time,
        "updated_at": datetime.utcnow().isoformat(),
    })

    # 2. Update affected bookings → LATE_ARRIVAL
    bookings_ref = itin_ref.collection("bookings")
    for booking_doc in bookings_ref.stream():
        booking = booking_doc.to_dict()
        batch.update(bookings_ref.document(booking_doc.id), {
            "status": "LATE_ARRIVAL",
            "updated_at": datetime.utcnow().isoformat(),
        })

        # Create alert for hotel admin
        if booking.get("property_id"):
            # Look up the property's admin UID
            prop_doc = db.collection("properties").document(booking["property_id"]).get()
            if prop_doc.exists:
                admin_uid = prop_doc.to_dict().get("admin_uid")
                if admin_uid:
                    alert_ref = db.collection("alerts").document()
                    batch.set(alert_ref, {
                        "target_uid": admin_uid,
                        "alert_type": "LATE_ARRIVAL",
                        "message": f"Guest {booking.get('traveler_name', 'Unknown')} delayed. New arrival: {new_time}.",
                        "itinerary_id": itinerary_id,
                        "booking_id": booking_doc.id,
                        "read": False,
                        "created_at": datetime.utcnow().isoformat(),
                    })

        cascaded_updates.append({
            "type": "BOOKING",
            "id": booking_doc.id,
            "new_status": "LATE_ARRIVAL",
        })

    # 3. Mark affected activities as MISSED
    activities_ref = itin_ref.collection("activities")
    for act_doc in activities_ref.stream():
        activity = act_doc.to_dict()
        scheduled = activity.get("scheduled_time", "")

        # If activity is before the new arrival time, mark as missed
        if scheduled and scheduled < new_time:
            batch.update(activities_ref.document(act_doc.id), {
                "status": "MISSED",
                "updated_at": datetime.utcnow().isoformat(),
            })

            # Create alert for tour operator
            if activity.get("tour_id"):
                tour_doc = db.collection("tours").document(activity["tour_id"]).get()
                if tour_doc.exists:
                    operator_uid = tour_doc.to_dict().get("operator_uid")
                    if operator_uid:
                        alert_ref = db.collection("alerts").document()
                        batch.set(alert_ref, {
                            "target_uid": operator_uid,
                            "alert_type": "ACTIVITY_MISSED",
                            "message": f"Traveler missed {activity.get('tour_name', 'activity')} due to {disruption_type}.",
                            "itinerary_id": itinerary_id,
                            "activity_id": act_doc.id,
                            "read": False,
                            "created_at": datetime.utcnow().isoformat(),
                        })

            cascaded_updates.append({
                "type": "ACTIVITY",
                "id": act_doc.id,
                "new_status": "MISSED",
            })

    # 4. Write disruption event record
    disruption_event = {
        "itinerary_id": itinerary_id,
        "traveler_uid": uid,
        "disruption_type": disruption_type,
        "original_time": original_time,
        "new_time": new_time,
        "notes": notes,
        "destination": itin_data.get("destination", ""),
        "cascaded_updates": cascaded_updates,
        "created_at": datetime.utcnow().isoformat(),
    }
    disruption_ref = db.collection("disruption_events").document()
    batch.set(disruption_ref, disruption_event)

    # 5. Write audit log
    audit_ref = db.collection("activity_log").document()
    batch.set(audit_ref, {
        "actor_uid": uid,
        "actor_role": g.current_user["role"],
        "action": "ITINERARY_DISRUPTED",
        "resource_type": "itinerary",
        "resource_id": itinerary_id,
        "timestamp": datetime.utcnow().isoformat(),
        "changes": {
            "before": {"status": old_status},
            "after": {"status": "DISRUPTED", "disruption_type": disruption_type},
        },
    })

    # Commit the batch atomically
    try:
        batch.commit()
    except Exception as e:
        return error_response("DISRUPTION_FAILED", f"Batch write failed: {str(e)}", 500)

    # 6. Publish to Redis for SSE delivery
    publish_event("disruptions", {
        "event_type": "DISRUPTION",
        "itinerary_id": itinerary_id,
        "disruption_type": disruption_type,
        "new_time": new_time,
        "cascaded_updates": cascaded_updates,
        "timestamp": datetime.utcnow().isoformat(),
    })

    return success_response({
        "itinerary_id": itinerary_id,
        "status": "DISRUPTED",
        "cascaded_updates": cascaded_updates,
        "disruption_event_id": disruption_ref.id,
        "audit_log_id": audit_ref.id,
    }, 200, "Disruption reported and cascaded successfully.")
