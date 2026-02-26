"""
AI Blueprint - Bedrock GPT-OSS-powered trip planning endpoints.
"""

import logging
from flask import Blueprint, g, request
from app.services.ai_model import (
    suggest_destinations,
    generate_trip_plan,
    is_ai_configured,
)
from app.services.planner_errors import (
    PLANNER_FORBIDDEN,
    PLANNER_NOT_FOUND,
    PLANNER_VALIDATION_FAILED,
)
from app.services.planner_orchestrator import (
    cancel_session,
    create_session,
    get_session,
    list_sessions,
    run_session,
)
from app.services.planner_schemas import validate_create_session_payload
from app.services.socket_service import get_socketio
from app.utils.auth import require_auth, require_role
from app.utils.responses import success_response, error_response

logger = logging.getLogger(__name__)

ai_bp = Blueprint("ai", __name__, url_prefix="/api/ai")


@ai_bp.route("/suggest-destinations", methods=["POST"])
def ai_suggest_destinations():
    """Suggest travel destinations based on a vague user query."""
    if not is_ai_configured():
        logger.error("AI model configuration missing")
        return error_response(
            "AI_NOT_CONFIGURED",
            "AI service not configured. Set AWS_KEY/AWS_SECRET in .env",
            503,
        )

    data = request.get_json(force=True, silent=True) or {}
    query = data.get("query", "").strip()
    logger.info(f"AI suggest-destinations called with query='{query}', raw data={data}")

    if not query:
        return error_response("VALIDATION_ERROR", "Please provide a travel query", 400)

    results = suggest_destinations(query, count=data.get("count", 6))

    if results is None:
        return error_response("AI_GENERATION_FAILED", "AI failed to generate suggestions. Try again.", 500)

    return success_response(results)


@ai_bp.route("/plan-trip", methods=["POST"])
def ai_plan_trip():
    """Generate a full day-by-day trip plan for a chosen destination."""
    if not is_ai_configured():
        return error_response("AI_NOT_CONFIGURED", "AI service not configured", 503)

    data = request.get_json(force=True, silent=True) or {}
    destination = data.get("destination", "").strip()
    days = data.get("days", 3)
    interests = data.get("interests", [])
    budget = data.get("budget")

    if not destination:
        return error_response("VALIDATION_ERROR", "Please provide a destination", 400)

    if days < 1 or days > 14:
        return error_response("VALIDATION_ERROR", "Trip duration must be 1-14 days", 400)

    plan = generate_trip_plan(destination, days, interests, budget)

    if plan is None:
        return error_response("AI_GENERATION_FAILED", "AI failed to generate trip plan. Try again.", 500)

    return success_response(plan)


@ai_bp.route("/planner/sessions", methods=["POST"])
@require_auth
@require_role("TRAVELER")
def create_planner_session():
    """Create and start a realtime planner session."""
    data = request.get_json(force=True, silent=True) or {}
    normalized, validation_error = validate_create_session_payload(data)
    if validation_error:
        return error_response(PLANNER_VALIDATION_FAILED, validation_error, 400)

    traveler_uid = g.current_user["uid"]
    session = create_session(traveler_uid, normalized)
    socketio = get_socketio()
    socketio.start_background_task(run_session, session["id"])

    return success_response(
        {
            "id": session["id"],
            "status": session["status"],
            "input": session["input"],
            "created_at": session["created_at"],
        },
        201,
        "Planner session started.",
    )


@ai_bp.route("/planner/sessions", methods=["GET"])
@require_auth
@require_role("TRAVELER")
def list_planner_sessions():
    uid = g.current_user["uid"]
    sessions = list_sessions(uid, limit=20)
    return success_response(sessions)


@ai_bp.route("/planner/sessions/<session_id>", methods=["GET"])
@require_auth
@require_role("TRAVELER")
def get_planner_session(session_id):
    uid = g.current_user["uid"]
    session, err_code, err_message = get_session(session_id, uid)
    if err_code == PLANNER_NOT_FOUND:
        return error_response(err_code, err_message, 404)
    if err_code:
        return error_response(PLANNER_FORBIDDEN, err_message, 403)
    return success_response(session)


@ai_bp.route("/planner/sessions/<session_id>/cancel", methods=["POST"])
@require_auth
@require_role("TRAVELER")
def cancel_planner_session(session_id):
    uid = g.current_user["uid"]
    ok, err_code, err_message = cancel_session(session_id, uid)
    if not ok and err_code == PLANNER_NOT_FOUND:
        return error_response(err_code, err_message, 404)
    if not ok and err_code:
        return error_response(PLANNER_FORBIDDEN, err_message, 403)
    return success_response({"id": session_id, "status": "CANCELLED"})
