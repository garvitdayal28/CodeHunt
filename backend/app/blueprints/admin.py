"""
Hotel Admin Blueprint — Bookings, occupancy, alerts, and late check-out management.
"""

from flask import Blueprint, request, g
from app.utils.auth import require_auth, require_role
from app.utils.responses import success_response, error_response
from app.services.firebase_service import get_firestore_client
from app.services.redis_service import publish_event
from datetime import datetime

admin_bp = Blueprint("admin", __name__, url_prefix="/api/admin/hotel")


@admin_bp.route("/bookings", methods=["GET"])
@require_auth
@require_role("HOTEL_ADMIN", "PLATFORM_ADMIN")
def get_hotel_bookings():
    """List all bookings for the admin's property with optional filters."""
    db = get_firestore_client()
    uid = g.current_user["uid"]

    # Get the admin's property
    props = db.collection("properties").where("admin_uid", "==", uid).limit(1).stream()
    property_doc = next(props, None)
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

    props = db.collection("properties").where("admin_uid", "==", uid).limit(1).stream()
    property_doc = next(props, None)
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
