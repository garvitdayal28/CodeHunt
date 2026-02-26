"""
Tour Operator Blueprint — Tour management, activity bookings, alerts, and reschedule flows.
"""

from flask import Blueprint, request, g
from app.utils.auth import require_auth, require_role
from app.utils.responses import success_response, error_response
from app.services.firebase_service import get_firestore_client
from app.services.rag_indexer_service import upsert_entity
from app.services.redis_service import publish_event
from datetime import datetime

operator_bp = Blueprint("operator", __name__, url_prefix="/api/operator")


@operator_bp.route("/tours", methods=["GET"])
@require_auth
@require_role("TOUR_OPERATOR", "PLATFORM_ADMIN")
def get_tours():
    """Get all tours managed by this operator."""
    db = get_firestore_client()
    uid = g.current_user["uid"]

    query = db.collection("tours").where("operator_uid", "==", uid)
    tours = []
    for doc in query.stream():
        tour = doc.to_dict()
        tour["id"] = doc.id
        tours.append(tour)

    return success_response(tours)


@operator_bp.route("/tours", methods=["POST"])
@require_auth
@require_role("TOUR_OPERATOR")
def create_tour():
    """Create a new tour."""
    data = request.get_json()
    if not data:
        return error_response("INVALID_BODY", "Request body must be JSON.", 400)

    required = ["name", "description", "destination", "duration_hours", "price"]
    for field in required:
        if field not in data:
            return error_response("MISSING_FIELDS", f"{field} is required.", 400)

    db = get_firestore_client()
    uid = g.current_user["uid"]

    tour_data = {
        "operator_uid": uid,
        "name": data["name"],
        "description": data["description"],
        "destination": data["destination"],
        "duration_hours": data["duration_hours"],
        "price": data["price"],
        "category_tags": data.get("category_tags", []),
        "rating": data.get("rating", 0),
        "created_at": datetime.utcnow().isoformat(),
    }

    doc_ref = db.collection("tours").add(tour_data)
    tour_data["id"] = doc_ref[1].id
    try:
        upsert_entity("TOUR", tour_data["id"])
    except Exception:
        pass

    return success_response(tour_data, 201, "Tour created.")


@operator_bp.route("/activities", methods=["GET"])
@require_auth
@require_role("TOUR_OPERATOR", "PLATFORM_ADMIN")
def get_operator_activities():
    """Get all activity bookings for this operator's tours."""
    db = get_firestore_client()
    uid = g.current_user["uid"]

    # Get operator's tour IDs
    tours = db.collection("tours").where("operator_uid", "==", uid).stream()
    tour_ids = [t.id for t in tours]

    if not tour_ids:
        return success_response([])

    # Query activities across all itineraries
    activities = []
    for tour_id in tour_ids:
        query = db.collection_group("activities").where("tour_id", "==", tour_id)
        for doc in query.stream():
            activity = doc.to_dict()
            activity["id"] = doc.id
            activities.append(activity)

    return success_response(activities)


@operator_bp.route("/alerts", methods=["GET"])
@require_auth
@require_role("TOUR_OPERATOR", "PLATFORM_ADMIN")
def get_operator_alerts():
    """Get pending disruption alerts for this operator."""
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


@operator_bp.route("/reschedule", methods=["POST"])
@require_auth
@require_role("TOUR_OPERATOR")
def offer_reschedule():
    """Offer a reschedule slot to a disrupted traveler."""
    data = request.get_json()
    if not data:
        return error_response("INVALID_BODY", "Request body must be JSON.", 400)

    required = ["activity_id", "itinerary_id", "new_time_slot", "traveler_uid"]
    for field in required:
        if field not in data:
            return error_response("MISSING_FIELDS", f"{field} is required.", 400)

    db = get_firestore_client()

    # Create reschedule offer alert for the traveler
    db.collection("alerts").add({
        "target_uid": data["traveler_uid"],
        "alert_type": "RESCHEDULE_OFFER",
        "message": f"A new time slot is available for your missed activity.",
        "activity_id": data["activity_id"],
        "itinerary_id": data["itinerary_id"],
        "new_time_slot": data["new_time_slot"],
        "read": False,
        "created_at": datetime.utcnow().isoformat(),
    })

    # Publish via SSE
    publish_event("disruptions", {
        "event_type": "RESCHEDULE_OFFERED",
        "activity_id": data["activity_id"],
        "traveler_uid": data["traveler_uid"],
        "new_time_slot": data["new_time_slot"],
        "timestamp": datetime.utcnow().isoformat(),
    })

    return success_response({
        "activity_id": data["activity_id"],
        "status": "RESCHEDULE_OFFERED",
    }, 200, "Reschedule offer sent.")
