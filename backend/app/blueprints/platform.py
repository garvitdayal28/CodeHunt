"""
Platform Admin Blueprint — Overview stats, disruption feed, audit log, and exports.
"""

import csv
import io
from flask import Blueprint, request, g, Response
from app.utils.auth import require_auth, require_role
from app.utils.responses import success_response, error_response
from app.services.firebase_service import get_firestore_client
from datetime import datetime

platform_bp = Blueprint("platform", __name__, url_prefix="/api/platform")


@platform_bp.route("/overview", methods=["GET"])
@require_auth
@require_role("PLATFORM_ADMIN")
def get_overview():
    """Aggregated summary stats for the platform admin dashboard."""
    db = get_firestore_client()

    # Count totals
    itineraries = list(db.collection("itineraries").stream())
    disruptions = list(db.collection("disruption_events").stream())
    properties = list(db.collection("properties").stream())
    tours = list(db.collection("tours").stream())
    users = list(db.collection("users").stream())

    total_bookings = 0
    total_revenue = 0
    active_trips = 0

    for itin in itineraries:
        data = itin.to_dict()
        if data.get("status") in ["CONFIRMED", "ON_TRACK", "DISRUPTED"]:
            active_trips += 1
        bookings = list(
            db.collection("itineraries").document(itin.id).collection("bookings").stream()
        )
        total_bookings += len(bookings)

    return success_response({
        "total_users": len(users),
        "total_itineraries": len(itineraries),
        "total_bookings": total_bookings,
        "active_trips": active_trips,
        "total_disruptions": len(disruptions),
        "total_properties": len(properties),
        "total_tours": len(tours),
    })


@platform_bp.route("/disruptions", methods=["GET"])
@require_auth
@require_role("PLATFORM_ADMIN")
def get_disruptions():
    """All disruption events with optional filters."""
    db = get_firestore_client()

    query = db.collection("disruption_events").order_by("created_at", direction="DESCENDING")

    # Optional filters
    disruption_type = request.args.get("type")
    destination = request.args.get("destination")

    if disruption_type:
        query = query.where("disruption_type", "==", disruption_type)
    if destination:
        query = query.where("destination", "==", destination)

    disruptions = []
    for doc in query.stream():
        d = doc.to_dict()
        d["id"] = doc.id
        disruptions.append(d)

    return success_response(disruptions)


@platform_bp.route("/audit-log", methods=["GET"])
@require_auth
@require_role("PLATFORM_ADMIN")
def get_audit_log():
    """Full audit log with pagination and optional filters."""
    db = get_firestore_client()

    query = db.collection("activity_log").order_by("timestamp", direction="DESCENDING")

    action_filter = request.args.get("action")
    if action_filter:
        query = query.where("action", "==", action_filter)

    # Pagination
    page_size = min(int(request.args.get("page_size", 20)), 100)
    query = query.limit(page_size)

    logs = []
    for doc in query.stream():
        log = doc.to_dict()
        log["id"] = doc.id
        logs.append(log)

    return success_response(logs)


@platform_bp.route("/export", methods=["GET"])
@require_auth
@require_role("PLATFORM_ADMIN")
def export_data():
    """Export filtered data as CSV."""
    db = get_firestore_client()
    export_type = request.args.get("type", "audit_log")

    if export_type == "audit_log":
        docs = db.collection("activity_log").order_by("timestamp", direction="DESCENDING").stream()
        fields = ["timestamp", "actor_uid", "actor_role", "action", "resource_type", "resource_id"]
    elif export_type == "disruptions":
        docs = db.collection("disruption_events").order_by("created_at", direction="DESCENDING").stream()
        fields = ["created_at", "disruption_type", "destination", "itinerary_id", "traveler_uid"]
    else:
        return error_response("INVALID_TYPE", "Export type must be 'audit_log' or 'disruptions'.", 400)

    # Generate CSV
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=fields, extrasaction="ignore")
    writer.writeheader()
    for doc in docs:
        writer.writerow(doc.to_dict())

    return Response(
        output.getvalue(),
        mimetype="text/csv",
        headers={"Content-Disposition": f"attachment; filename={export_type}_{datetime.utcnow().strftime('%Y%m%d')}.csv"},
    )
