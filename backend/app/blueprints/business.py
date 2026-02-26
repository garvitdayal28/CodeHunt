"""
Business Blueprint - business profile retrieval and updates.
"""

from datetime import datetime

from flask import Blueprint, g, request

from app.services.firebase_service import get_firestore_client
from app.utils.auth import require_auth, require_role
from app.utils.business_profile import BUSINESS_ROLE, validate_and_normalize_business_profile
from app.utils.responses import error_response, success_response

business_bp = Blueprint("business", __name__, url_prefix="/api/business")


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
