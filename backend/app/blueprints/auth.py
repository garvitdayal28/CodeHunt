"""
Auth Blueprint — Registration, login, token refresh.
"""

from flask import Blueprint, request
from app.utils.responses import success_response, error_response
from app.services.firebase_service import (
    create_firebase_user,
    set_custom_claims,
    get_firestore_client,
)

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")

VALID_ROLES = ["TRAVELER", "HOTEL_ADMIN", "TOUR_OPERATOR", "PLATFORM_ADMIN"]


@auth_bp.route("/register", methods=["POST"])
def register():
    """
    Register a new user.
    Expects: { email, password, display_name, role }
    Creates Firebase Auth user, sets custom role claim,
    and writes user document to Firestore.
    """
    data = request.get_json()

    if not data:
        return error_response("INVALID_BODY", "Request body must be JSON.", 400)

    email = data.get("email")
    password = data.get("password")
    display_name = data.get("display_name")
    role = data.get("role", "TRAVELER")

    # Validation
    if not email or not password or not display_name:
        return error_response("MISSING_FIELDS", "email, password, and display_name are required.", 400)

    if role not in VALID_ROLES:
        return error_response("INVALID_ROLE", f"Role must be one of: {', '.join(VALID_ROLES)}", 400)

    if len(password) < 6:
        return error_response("WEAK_PASSWORD", "Password must be at least 6 characters.", 400)

    try:
        # Create Firebase Auth user
        user = create_firebase_user(email, password, display_name)

        # Set custom claims (role embedded in JWT)
        set_custom_claims(user.uid, {"role": role})

        # Write user document to Firestore
        db = get_firestore_client()
        db.collection("users").document(user.uid).set({
            "uid": user.uid,
            "email": email,
            "display_name": display_name,
            "role": role,
            "created_at": __import__("datetime").datetime.utcnow().isoformat(),
            "linked_property_id": data.get("linked_property_id"),
            "linked_operator_id": data.get("linked_operator_id"),
        })

        return success_response({
            "uid": user.uid,
            "email": email,
            "display_name": display_name,
            "role": role,
        }, 201, "User registered successfully.")

    except Exception as e:
        return error_response("REGISTRATION_FAILED", str(e), 400)


@auth_bp.route("/login", methods=["POST"])
def login():
    """
    Login is handled client-side by Firebase Auth SDK.
    This endpoint exists for any server-side post-login setup if needed.
    The client sends the Firebase ID token, and we verify it.
    """
    data = request.get_json()
    id_token = data.get("id_token") if data else None

    if not id_token:
        return error_response("MISSING_TOKEN", "id_token is required.", 400)

    from app.services.firebase_service import verify_firebase_token

    decoded = verify_firebase_token(id_token)
    if decoded is None:
        return error_response("INVALID_TOKEN", "The provided token is invalid or expired.", 401)

    return success_response({
        "uid": decoded.get("uid"),
        "email": decoded.get("email"),
        "role": decoded.get("role", "TRAVELER"),
    }, 200, "Login verified.")


@auth_bp.route("/me", methods=["GET"])
def get_current_user():
    """
    Return the current user's profile from Firestore.
    Requires a valid Bearer token.
    """
    from app.utils.auth import require_auth
    # This route uses inline auth check for simplicity
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return error_response("MISSING_TOKEN", "Authorization header required.", 401)

    token = auth_header.split("Bearer ")[1]
    from app.services.firebase_service import verify_firebase_token
    decoded = verify_firebase_token(token)
    if decoded is None:
        return error_response("INVALID_TOKEN", "Invalid or expired token.", 401)

    uid = decoded.get("uid")
    db = get_firestore_client()
    user_doc = db.collection("users").document(uid).get()

    if not user_doc.exists:
        return error_response("USER_NOT_FOUND", "User profile not found.", 404)

    return success_response(user_doc.to_dict())
