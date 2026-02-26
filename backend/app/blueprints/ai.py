"""
AI Blueprint - Bedrock GPT-OSS-powered trip planning endpoints.
"""

import logging
from flask import Blueprint, request
from app.services.ai_model import (
    suggest_destinations,
    generate_trip_plan,
    is_ai_configured,
)
from app.utils.responses import success_response, error_response

logger = logging.getLogger(__name__)

ai_bp = Blueprint("ai", __name__, url_prefix="/api/ai")


@ai_bp.route("/suggest-destinations", methods=["POST"])
def ai_suggest_destinations():
    """Suggest travel destinations based on a vague user query."""
    if not is_ai_configured():
        logger.error("AI model configuration missing")
        return error_response("AI service not configured. Set AWS_KEY/AWS_SECRET in .env", 503)

    data = request.get_json(force=True, silent=True) or {}
    query = data.get("query", "").strip()
    logger.info(f"AI suggest-destinations called with query='{query}', raw data={data}")

    if not query:
        return error_response("Please provide a travel query", 400)

    results = suggest_destinations(query, count=data.get("count", 6))

    if results is None:
        return error_response("AI failed to generate suggestions. Try again.", 500)

    return success_response(results)


@ai_bp.route("/plan-trip", methods=["POST"])
def ai_plan_trip():
    """Generate a full day-by-day trip plan for a chosen destination."""
    if not is_ai_configured():
        return error_response("AI service not configured", 503)

    data = request.get_json(force=True, silent=True) or {}
    destination = data.get("destination", "").strip()
    days = data.get("days", 3)
    interests = data.get("interests", [])
    budget = data.get("budget")

    if not destination:
        return error_response("Please provide a destination", 400)

    if days < 1 or days > 14:
        return error_response("Trip duration must be 1-14 days", 400)

    plan = generate_trip_plan(destination, days, interests, budget)

    if plan is None:
        return error_response("AI failed to generate trip plan. Try again.", 500)

    return success_response(plan)
