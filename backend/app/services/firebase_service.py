"""
Firebase Admin SDK initialization.
Handles both Base64-encoded service account JSON (for deployment)
and local serviceAccountKey.json file (for development).
"""

import os
import json
import base64
import logging
import time
import firebase_admin
from firebase_admin import credentials, auth, firestore


_firebase_app = None
_firestore_client = None
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# In-memory user doc cache — reduces Firestore reads on auth/me
# ---------------------------------------------------------------------------
_user_cache = {}  # uid -> {"data": dict, "ts": float}
_USER_CACHE_TTL = 60  # seconds


def get_cached_user(uid):
    """Return cached user dict or None if expired/missing."""
    entry = _user_cache.get(uid)
    if entry and (time.time() - entry["ts"]) < _USER_CACHE_TTL:
        return entry["data"]
    return None


def set_cached_user(uid, data):
    """Store user dict in cache with current timestamp."""
    _user_cache[uid] = {"data": data, "ts": time.time()}


def invalidate_cached_user(uid):
    """Remove a user from cache (e.g. after profile update)."""
    _user_cache.pop(uid, None)

# ---------------------------------------------------------------------------
# Firestore retry helper — handles 429 Quota Exceeded gracefully
# ---------------------------------------------------------------------------

def firestore_retry(fn, max_retries=5, base_delay=2.0):
    """
    Call *fn()* with exponential backoff on Firestore quota errors.
    Returns the result of fn() on success, or re-raises on final failure.
    """
    for attempt in range(max_retries):
        try:
            return fn()
        except Exception as exc:
            exc_str = str(exc)
            # Catch 429 / RESOURCE_EXHAUSTED from google-api-core or grpc
            if "429" in exc_str or "Quota exceeded" in exc_str or "RESOURCE_EXHAUSTED" in exc_str:
                if attempt < max_retries - 1:
                    delay = base_delay * (2 ** attempt)
                    logger.warning(
                        "[FIRESTORE_RETRY] Quota exceeded, retrying in %.1fs (attempt %d/%d)",
                        delay, attempt + 1, max_retries,
                    )
                    time.sleep(delay)
                    continue
            raise


def _get_clock_skew_seconds():
    """Return allowed token clock skew in seconds (bounded for safety)."""
    raw = os.getenv("FIREBASE_CLOCK_SKEW_SECONDS", "5")
    try:
        skew = int(raw)
    except (TypeError, ValueError):
        skew = 5
    return max(0, min(skew, 60))


def init_firebase(app):
    """Initialize Firebase Admin SDK with the Flask app context."""
    global _firebase_app, _firestore_client

    if _firebase_app:
        return

    service_account_json = app.config.get("FIREBASE_SERVICE_ACCOUNT_JSON")

    if service_account_json:
        # Deployed environment — decode Base64 service account
        try:
            decoded = base64.b64decode(service_account_json)
            service_account_info = json.loads(decoded)
            cred = credentials.Certificate(service_account_info)
        except Exception:
            # Maybe it's raw JSON, not Base64
            service_account_info = json.loads(service_account_json)
            cred = credentials.Certificate(service_account_info)
    else:
        # Local development — look for serviceAccount.json
        # __file__ is app/services/firebase_service.py, so go up 3 levels to backend/
        key_path = os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "serviceAccount.json"
        )
        if os.path.exists(key_path):
            cred = credentials.Certificate(key_path)
        else:
            # Fall back to Application Default Credentials
            cred = credentials.ApplicationDefault()

    try:
        _firebase_app = firebase_admin.initialize_app(cred)
        _firestore_client = firestore.client()
        app.logger.info("Firebase Admin SDK initialized successfully.")
    except Exception as e:
        app.logger.warning(f"Firebase Admin SDK initialization failed: {e}. Firestore will be unavailable until credentials are provided.")


def get_firestore_client():
    """Return the Firestore client instance."""
    global _firestore_client
    if _firestore_client is None:
        _firestore_client = firestore.client()
    return _firestore_client


def verify_firebase_token(id_token):
    """
    Verify a Firebase ID token and return the decoded claims.
    Returns None if the token is invalid.
    """
    try:
        decoded_token = auth.verify_id_token(
            id_token,
            check_revoked=False,
            clock_skew_seconds=_get_clock_skew_seconds(),
        )
        return decoded_token
    except Exception as e:
        logging.warning(f"Token verification failed: {e}")
        return None


def set_custom_claims(uid, claims):
    """
    Set custom claims on a Firebase user (e.g., role).
    Claims are embedded in the ID token after refresh.
    """
    auth.set_custom_user_claims(uid, claims)


def get_user_by_uid(uid):
    """Fetch a Firebase Auth user record by UID."""
    try:
        return auth.get_user(uid)
    except Exception:
        return None


def create_firebase_user(email, password, display_name):
    """Create a new Firebase Auth user."""
    user = auth.create_user(
        email=email,
        password=password,
        display_name=display_name,
    )
    return user
