"""
Standardized API response helpers.
All error responses follow a consistent envelope format.
"""

import uuid
from flask import jsonify


def success_response(data, status_code=200, message=None):
    """Return a standardized success JSON response."""
    body = {"data": data}
    if message:
        body["message"] = message
    return jsonify(body), status_code


def error_response(error_code, message, status_code=400):
    """
    Return a standardized error JSON response.
    Envelope: { "error": "CODE", "message": "...", "request_id": "uuid" }
    """
    body = {
        "error": error_code,
        "message": message,
        "request_id": str(uuid.uuid4()),
    }
    return jsonify(body), status_code


def paginated_response(data, cursor=None, page_size=20):
    """Return a standardized paginated response."""
    body = {
        "data": data,
        "pagination": {
            "page_size": page_size,
            "next_cursor": cursor,
            "has_more": cursor is not None,
        },
    }
    return jsonify(body), 200
