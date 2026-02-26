"""
Firebase Admin SDK initialization.
Handles both Base64-encoded service account JSON (for deployment)
and local serviceAccountKey.json file (for development).
"""

import os
import json
import base64
import firebase_admin
from firebase_admin import credentials, auth, firestore


_firebase_app = None
_firestore_client = None


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
        key_path = os.path.join(
            os.path.dirname(os.path.dirname(__file__)), "serviceAccount.json"
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
        decoded_token = auth.verify_id_token(id_token)
        return decoded_token
    except Exception:
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
