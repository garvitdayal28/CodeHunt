"""
Auth Blueprint - Registration, login, and profile lookup.
"""

from datetime import datetime

from flask import Blueprint, request

from app.services.firebase_service import (
    create_firebase_user,
    firestore_retry,
    get_cached_user,
    get_firestore_client,
    get_user_by_uid,
    invalidate_cached_user,
    set_cached_user,
    set_custom_claims,
)
from app.utils.business_profile import BUSINESS_ROLE, validate_and_normalize_business_profile
from app.utils.responses import error_response, success_response

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")

VALID_ROLES = ["TRAVELER", BUSINESS_ROLE, "HOTEL_ADMIN", "TOUR_OPERATOR", "PLATFORM_ADMIN"]


@auth_bp.route("/register", methods=["POST"])
def register():
    """
    Register or sync a new user profile.
    Expects: { email, password, display_name, role, uid?, business_profile? }.
    """
    data = request.get_json()
    if not data:
        return error_response("INVALID_BODY", "Request body must be JSON.", 400)

    email = data.get("email")
    password = data.get("password")
    display_name = data.get("display_name")
    role = data.get("role", "TRAVELER")
    provided_uid = data.get("uid")
    business_profile_data = data.get("business_profile")

    if not email or not password or not display_name:
        return error_response("MISSING_FIELDS", "email, password, and display_name are required.", 400)

    if role not in VALID_ROLES:
        return error_response("INVALID_ROLE", f"Role must be one of: {', '.join(VALID_ROLES)}", 400)

    if len(password) < 6:
        return error_response("WEAK_PASSWORD", "Password must be at least 6 characters.", 400)

    normalized_business_profile = None
    if role == BUSINESS_ROLE:
        if not business_profile_data:
            return error_response("MISSING_BUSINESS_PROFILE", "business_profile is required for BUSINESS role.", 400)
        try:
            normalized_business_profile = validate_and_normalize_business_profile(business_profile_data)
        except ValueError as e:
            return error_response("INVALID_BUSINESS_PROFILE", str(e), 400)

    try:
        if provided_uid:
            user = get_user_by_uid(provided_uid)
            if user is None:
                return error_response("INVALID_UID", "Provided uid does not exist in Firebase Auth.", 400)
            if user.email.lower() != email.lower():
                return error_response("EMAIL_UID_MISMATCH", "Provided email does not match the provided uid.", 400)
        else:
            user = create_firebase_user(email, password, display_name)

        set_custom_claims(user.uid, {"role": role})

        db = get_firestore_client()
        user_ref = db.collection("users").document(user.uid)
        existing_doc = user_ref.get()
        now_iso = datetime.utcnow().isoformat()

        payload = {
            "uid": user.uid,
            "email": email,
            "display_name": display_name,
            "role": role,
            "updated_at": now_iso,
            "linked_property_id": data.get("linked_property_id"),
            "linked_operator_id": data.get("linked_operator_id"),
            "business_profile": normalized_business_profile if role == BUSINESS_ROLE else None,
        }

        if not existing_doc.exists:
            payload["created_at"] = now_iso

        user_ref.set(payload, merge=True)

        return success_response(
            {
                "uid": user.uid,
                "email": email,
                "display_name": display_name,
                "role": role,
                "business_profile": normalized_business_profile,
            },
            201,
            "User registered successfully.",
        )

    except Exception as e:
        return error_response("REGISTRATION_FAILED", str(e), 400)


@auth_bp.route("/login", methods=["POST"])
def login():
    """
    Login is handled client-side by Firebase Auth SDK.
    This endpoint verifies the provided ID token.
    """
    data = request.get_json()
    id_token = data.get("id_token") if data else None

    if not id_token:
        return error_response("MISSING_TOKEN", "id_token is required.", 400)

    from app.services.firebase_service import verify_firebase_token

    decoded = verify_firebase_token(id_token)
    if decoded is None:
        return error_response("INVALID_TOKEN", "The provided token is invalid or expired.", 401)

    return success_response(
        {
            "uid": decoded.get("uid"),
            "email": decoded.get("email"),
            "role": decoded.get("role", "TRAVELER"),
        },
        200,
        "Login verified.",
    )


@auth_bp.route("/me", methods=["GET"])
def get_current_user():
    """
    Return the current user's profile from Firestore.
    Requires a valid Bearer token.
    """
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return error_response("MISSING_TOKEN", "Authorization header required.", 401)

    token = auth_header.split(" ", 1)[1].strip()
    if not token:
        return error_response("MISSING_TOKEN", "Authorization token is required.", 401)

    from app.services.firebase_service import verify_firebase_token

    decoded = verify_firebase_token(token)
    if decoded is None:
        return error_response("INVALID_TOKEN", "Invalid or expired token.", 401)

    uid = decoded.get("uid")

    # Fast path: return cached user doc if available
    cached = get_cached_user(uid)
    if cached:
        return success_response(cached)

    db = get_firestore_client()
    user_ref = db.collection("users").document(uid)
    user_doc = firestore_retry(lambda: user_ref.get())

    if not user_doc.exists:
        # Self-heal for users that exist in Firebase Auth but missed profile sync.
        now_iso = datetime.utcnow().isoformat()
        fallback_profile = {
            "uid": uid,
            "email": decoded.get("email"),
            "display_name": decoded.get("name") or (decoded.get("email", "").split("@")[0] if decoded.get("email") else "Traveler"),
            "role": decoded.get("role", "TRAVELER"),
            "created_at": now_iso,
            "updated_at": now_iso,
            "business_profile": None,
            "linked_property_id": None,
            "linked_operator_id": None,
        }
        firestore_retry(lambda: user_ref.set(fallback_profile, merge=True))
        set_cached_user(uid, fallback_profile)
        return success_response(fallback_profile, 200, "User profile auto-created.")

    user_data = user_doc.to_dict()
    set_cached_user(uid, user_data)
    return success_response(user_data)


@auth_bp.route("/me", methods=["PUT"])
def update_current_user():
    """
    Update current user's profile (traveler-focused editable fields).
    Requires a valid Bearer token.
    """
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return error_response("MISSING_TOKEN", "Authorization header required.", 401)

    token = auth_header.split(" ", 1)[1].strip()
    if not token:
        return error_response("MISSING_TOKEN", "Authorization token is required.", 401)

    from app.services.firebase_service import verify_firebase_token

    decoded = verify_firebase_token(token)
    if decoded is None:
        return error_response("INVALID_TOKEN", "Invalid or expired token.", 401)

    data = request.get_json()
    if not data or not isinstance(data, dict):
        return error_response("INVALID_BODY", "Request body must be a JSON object.", 400)

    uid = decoded.get("uid")
    db = get_firestore_client()
    user_ref = db.collection("users").document(uid)
    user_doc = firestore_retry(lambda: user_ref.get())
    if not user_doc.exists:
        return error_response("USER_NOT_FOUND", "User profile not found.", 404)

    current = user_doc.to_dict()
    if current.get("role") != "TRAVELER":
        return error_response("FORBIDDEN", "Only traveler profiles can be updated from this endpoint.", 403)

    allowed_fields = {"display_name", "phone", "city", "address", "bio"}
    payload = {"updated_at": datetime.utcnow().isoformat()}
    for field in allowed_fields:
        if field in data:
            value = data.get(field)
            payload[field] = str(value).strip() if value is not None else ""

    firestore_retry(lambda: user_ref.set(payload, merge=True))
    updated = firestore_retry(lambda: user_ref.get()).to_dict()
    invalidate_cached_user(uid)
    set_cached_user(uid, updated)
    return success_response(updated, 200, "Profile updated successfully.")
