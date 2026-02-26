"""
Authentication decorators for Flask routes.

@require_auth  — Verifies Firebase ID token, injects `g.current_user` with UID and claims.
@require_role  — Extends @require_auth to enforce role-based access control.
"""

from functools import wraps
from flask import request, g
from app.services.firebase_service import get_firestore_client, verify_firebase_token
from app.utils.responses import error_response


def require_auth(f):
    """
    Decorator that verifies the Firebase ID token from the Authorization header.
    On success, sets g.current_user = { uid, email, role, ... (full decoded token) }.
    On failure, returns 401.
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")

        if not auth_header.startswith("Bearer "):
            return error_response("MISSING_TOKEN", "Authorization header must be 'Bearer <token>'.", 401)

        token = auth_header.split(" ", 1)[1].strip()
        if not token:
            return error_response("MISSING_TOKEN", "Authorization token is required.", 401)

        decoded = verify_firebase_token(token)

        if decoded is None:
            return error_response("INVALID_TOKEN", "The provided token is invalid or expired.", 401)

        g.current_user = {
            "uid": decoded.get("uid"),
            "email": decoded.get("email"),
            "role": decoded.get("role", "TRAVELER"),
            "claims": decoded,
        }

        return f(*args, **kwargs)

    return decorated


def require_role(*allowed_roles):
    """
    Decorator factory that enforces role-based access control.
    Usage: @require_role("HOTEL_ADMIN", "PLATFORM_ADMIN")

    Must be applied AFTER @require_auth (i.e., listed above it in decorator stack):
        @bp.route(...)
        @require_auth
        @require_role("HOTEL_ADMIN")
        def my_view():
            ...
    """
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            # require_auth should have already set g.current_user
            current_user = getattr(g, "current_user", None)
            if current_user is None:
                return error_response("UNAUTHORIZED", "Authentication required.", 401)

            user_role = current_user.get("role", "")
            if user_role not in allowed_roles:
                uid = current_user.get("uid")
                if uid:
                    try:
                        db = get_firestore_client()
                        user_doc = db.collection("users").document(uid).get()
                        if user_doc.exists:
                            persisted_role = str((user_doc.to_dict() or {}).get("role") or "").strip()
                            if persisted_role in allowed_roles:
                                current_user["role"] = persisted_role
                                g.current_user = current_user
                                return f(*args, **kwargs)
                    except Exception:
                        pass

                return error_response(
                    "FORBIDDEN",
                    f"This action requires one of the following roles: {', '.join(allowed_roles)}.",
                    403,
                )

            return f(*args, **kwargs)

        return decorated

    return decorator
