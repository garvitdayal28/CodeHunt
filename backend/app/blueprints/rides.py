"""
Rides Blueprint - REST APIs for traveler/driver ride lifecycle.
"""

from flask import Blueprint, g, request

from app.services.firebase_service import get_firestore_client
from app.services.geocode_service import forward_geocode, reverse_geocode, suggest_addresses
from app.services.socket_service import end_ride_by_traveler, get_socketio
from app.utils.auth import require_auth, require_role
from app.utils.responses import error_response, success_response
from app.utils.rides import (
    RIDE_STATUS_COMPLETED,
    add_ride_event,
    is_cab_driver_user,
    normalize_city_key,
    serialize_doc,
    utcnow_iso,
)

rides_bp = Blueprint("rides", __name__, url_prefix="/api/rides")


def _sanitize_ride_for_driver(ride):
    if not isinstance(ride, dict):
        return ride
    sanitized = dict(ride)
    sanitized.pop("start_otp", None)
    return sanitized


def _require_cab_driver(uid):
    db = get_firestore_client()
    user_doc = db.collection("users").document(uid).get()
    if not user_doc.exists:
        return None
    user_data = user_doc.to_dict()
    if not is_cab_driver_user(user_data):
        return None
    return user_data


def _get_ride_or_404(ride_id):
    db = get_firestore_client()
    doc = db.collection("rides").document(ride_id).get()
    if not doc.exists:
        return None, error_response("NOT_FOUND", "Ride not found.", 404)
    return doc, None


@rides_bp.route("/traveler", methods=["GET"])
@require_auth
@require_role("TRAVELER")
def traveler_rides():
    db = get_firestore_client()
    uid = g.current_user["uid"]

    rides = []
    query = db.collection("rides").where("traveler_uid", "==", uid)
    for doc in query.stream():
        ride_data = serialize_doc(doc)
        if ride_data.get("status") == "EXPIRED":
            db.collection("rides").document(doc.id).delete()
        else:
            rides.append(ride_data)

    rides.sort(key=lambda r: r.get("created_at", ""), reverse=True)
    return success_response(rides)


@rides_bp.route("/driver", methods=["GET"])
@require_auth
@require_role("BUSINESS")
def driver_rides():
    db = get_firestore_client()
    uid = g.current_user["uid"]
    if _require_cab_driver(uid) is None:
        return error_response("FORBIDDEN", "Only CAB_DRIVER business users can access driver rides.", 403)

    rides = []
    query = db.collection("rides").where("driver_uid", "==", uid)
    for doc in query.stream():
        ride_data = serialize_doc(doc)
        if ride_data.get("status") == "EXPIRED":
            db.collection("rides").document(doc.id).delete()
        else:
            rides.append(_sanitize_ride_for_driver(ride_data))

    rides.sort(key=lambda r: r.get("created_at", ""), reverse=True)
    return success_response(rides)


@rides_bp.route("/driver/ratings", methods=["GET"])
@require_auth
@require_role("BUSINESS")
def driver_ratings():
    db = get_firestore_client()
    uid = g.current_user["uid"]
    if _require_cab_driver(uid) is None:
        return error_response("FORBIDDEN", "Only CAB_DRIVER business users can access driver ratings.", 403)

    ratings = []
    total_rides = 0
    rated_count = 0
    stars_sum = 0
    text_feedback_count = 0

    query = db.collection("rides").where("driver_uid", "==", uid)
    for doc in query.stream():
        total_rides += 1
        ride = doc.to_dict() or {}
        rating = ride.get("rating") or {}
        stars = rating.get("stars")
        message = str(rating.get("message") or "").strip()
        has_stars = isinstance(stars, int) and 1 <= stars <= 5
        has_message = bool(message)

        if has_stars:
            rated_count += 1
            stars_sum += stars
        if has_message:
            text_feedback_count += 1

        if not has_stars and not has_message:
            continue

        ratings.append(
            {
                "ride_id": doc.id,
                "stars": stars if has_stars else None,
                "message": message or None,
                "traveler_name": ride.get("traveler_name"),
                "source": (ride.get("source") or {}).get("address"),
                "destination": (ride.get("destination") or {}).get("address"),
                "completed_at": ride.get("completed_at"),
                "updated_at": rating.get("updated_at") or ride.get("updated_at") or ride.get("created_at"),
            }
        )

    ratings.sort(key=lambda r: r.get("updated_at", ""), reverse=True)
    summary = {
        "total_rides": total_rides,
        "rated_rides": rated_count,
        "text_feedback_count": text_feedback_count,
        "average_stars": round((stars_sum / rated_count), 2) if rated_count else None,
    }
    return success_response({"summary": summary, "ratings": ratings})


@rides_bp.route("/<ride_id>", methods=["GET"])
@require_auth
def get_ride(ride_id):
    uid = g.current_user["uid"]
    role = g.current_user["role"]
    doc, err = _get_ride_or_404(ride_id)
    if err:
        return err

    ride = doc.to_dict()
    if role == "TRAVELER" and ride.get("traveler_uid") != uid:
        return error_response("FORBIDDEN", "You do not have access to this ride.", 403)
    if role == "BUSINESS":
        if _require_cab_driver(uid) is None:
            return error_response("FORBIDDEN", "Only CAB_DRIVER business users can access rides.", 403)
        if ride.get("driver_uid") != uid:
            return error_response("FORBIDDEN", "You do not have access to this ride.", 403)
        ride = _sanitize_ride_for_driver(ride)
    if role not in {"TRAVELER", "BUSINESS", "PLATFORM_ADMIN"}:
        return error_response("FORBIDDEN", "You do not have access to this ride.", 403)

    ride["id"] = doc.id
    return success_response(ride)


@rides_bp.route("/geocode", methods=["POST"])
@require_auth
def geocode_location():
    data = request.get_json()
    if not data or not isinstance(data, dict):
        return error_response("INVALID_BODY", "Request body must be JSON object.", 400)

    source = data.get("source") or {}
    destination = data.get("destination") or {}
    use_current_location = bool(data.get("use_current_location"))
    uid = g.current_user["uid"]

    db = get_firestore_client()
    user_doc = db.collection("users").document(uid).get()
    user_city_hint = ""
    if user_doc.exists:
        user_data = user_doc.to_dict() or {}
        user_city_hint = (
            user_data.get("city")
            or ((user_data.get("business_profile") or {}).get("city"))
            or ""
        )

    source_resolved = None
    if isinstance(source, dict) and source.get("lat") is not None and source.get("lng") is not None:
        source_resolved = reverse_geocode(source.get("lat"), source.get("lng"))
        if source_resolved and source.get("address"):
            source_resolved["address"] = source.get("address")
    elif source.get("address"):
        source_resolved = forward_geocode(source.get("address"), city_hint=user_city_hint)

    destination_resolved = None
    destination_city_hint = (source_resolved or {}).get("city") or user_city_hint
    if isinstance(destination, dict) and destination.get("lat") is not None and destination.get("lng") is not None:
        destination_resolved = reverse_geocode(destination.get("lat"), destination.get("lng"))
        if destination_resolved and destination.get("address"):
            destination_resolved["address"] = destination.get("address")
    elif destination.get("address"):
        destination_resolved = forward_geocode(destination.get("address"), city_hint=destination_city_hint)

    if not source_resolved or not destination_resolved:
        return error_response(
            "GEOCODE_FAILED",
            "Could not resolve source/destination. Please provide valid locations.",
            400,
        )

    if use_current_location and not source_resolved.get("city"):
        return error_response("CITY_RESOLUTION_FAILED", "Could not derive city from current location.", 400)

    source_key = normalize_city_key(source_resolved.get("city"))
    destination_key = normalize_city_key(destination_resolved.get("city"))
    if source_key and destination_key and source_key != destination_key:
        destination_resolved = forward_geocode(
            destination.get("address") if isinstance(destination, dict) else None,
            city_hint=source_resolved.get("city") or user_city_hint,
        ) or destination_resolved

    return success_response({"source": source_resolved, "destination": destination_resolved})


@rides_bp.route("/geocode/suggest", methods=["POST"])
@require_auth
def geocode_suggest():
    data = request.get_json() or {}
    query = str(data.get("query") or "").strip()
    limit = data.get("limit", 5)
    city_hint = str(data.get("city_hint") or "").strip()

    if len(query) < 3:
        return success_response([])

    if not city_hint:
        uid = g.current_user["uid"]
        db = get_firestore_client()
        user_doc = db.collection("users").document(uid).get()
        if user_doc.exists:
            user_data = user_doc.to_dict() or {}
            city_hint = (
                user_data.get("city")
                or ((user_data.get("business_profile") or {}).get("city"))
                or ""
            )

    suggestions = suggest_addresses(query, city_hint=city_hint, limit=limit)
    return success_response(suggestions)


@rides_bp.route("/<ride_id>/end", methods=["POST"])
@require_auth
@require_role("TRAVELER")
def end_ride(ride_id):
    uid = g.current_user["uid"]
    updated, error_code, message = end_ride_by_traveler(ride_id, uid)
    if error_code:
        if error_code == "NOT_FOUND":
            return error_response("NOT_FOUND", message, 404)
        if error_code == "FORBIDDEN":
            return error_response("FORBIDDEN", message, 403)
        return error_response("INVALID_STATE", message, 400)
    return success_response(updated, 200, "Ride ended successfully.")


@rides_bp.route("/<ride_id>/rating", methods=["POST"])
@require_auth
@require_role("TRAVELER")
def rate_driver(ride_id):
    data = request.get_json() or {}
    stars = data.get("stars")
    message = str(data.get("message") or "").strip()
    uid = g.current_user["uid"]

    db = get_firestore_client()
    doc, err = _get_ride_or_404(ride_id)
    if err:
        return err

    ride = doc.to_dict()
    if ride.get("traveler_uid") != uid:
        return error_response("FORBIDDEN", "Only ride traveler can submit rating.", 403)
    if ride.get("status") != RIDE_STATUS_COMPLETED:
        return error_response("INVALID_STATE", "Rating can only be submitted after ride completion.", 400)

    normalized_stars = None
    if stars is not None:
        try:
            normalized_stars = int(stars)
        except (TypeError, ValueError):
            return error_response("INVALID_RATING", "stars must be an integer between 1 and 5.", 400)
        if normalized_stars < 1 or normalized_stars > 5:
            return error_response("INVALID_RATING", "stars must be between 1 and 5.", 400)

    rating_payload = {}
    if normalized_stars is not None:
        rating_payload["stars"] = normalized_stars
    if message:
        rating_payload["message"] = message
    rating_payload["updated_at"] = utcnow_iso()

    db.collection("rides").document(ride_id).set({"rating": rating_payload, "updated_at": utcnow_iso()}, merge=True)
    add_ride_event(db, ride_id, "RIDE_RATED", uid, rating_payload)

    driver_uid = ride.get("driver_uid")
    if normalized_stars is not None and driver_uid:
        driver_ref = db.collection("users").document(driver_uid)
        driver_doc = driver_ref.get()
        if driver_doc.exists:
            driver_data = driver_doc.to_dict()
            details = ((driver_data.get("business_profile") or {}).get("details") or {})
            count = int(details.get("cab_rating_count", 0))
            avg = float(details.get("cab_rating_avg", 0))
            new_count = count + 1
            new_avg = ((avg * count) + normalized_stars) / new_count
            driver_ref.set(
                {
                    "business_profile": {
                        **(driver_data.get("business_profile") or {}),
                        "details": {
                            **details,
                            "cab_rating_count": new_count,
                            "cab_rating_avg": round(new_avg, 2),
                        },
                    },
                    "updated_at": utcnow_iso(),
                },
                merge=True,
            )

    updated = db.collection("rides").document(ride_id).get().to_dict()
    updated["id"] = ride_id

    if driver_uid:
        socketio = get_socketio()
        socketio.emit(
            "ride:rated",
            {
                "ride_id": ride_id,
                "rating": {
                    "stars": normalized_stars,
                    "message": message or None,
                },
                "traveler_name": ride.get("traveler_name"),
            },
            room=f"user:{driver_uid}",
            namespace="/rides",
        )

    return success_response(updated, 200, "Rating submitted.")
