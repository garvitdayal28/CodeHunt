"""
Shared helpers and constants for the rides module.
"""

import math
import re
from datetime import datetime

from app.services.firebase_service import get_firestore_client

RIDE_STATUS_REQUESTED = "REQUESTED"
RIDE_STATUS_ACCEPTED_PENDING_QUOTE = "ACCEPTED_PENDING_QUOTE"
RIDE_STATUS_QUOTE_SENT = "QUOTE_SENT"
RIDE_STATUS_QUOTE_ACCEPTED = "QUOTE_ACCEPTED"
RIDE_STATUS_DRIVER_EN_ROUTE = "DRIVER_EN_ROUTE"
RIDE_STATUS_IN_PROGRESS = "IN_PROGRESS"
RIDE_STATUS_COMPLETED = "COMPLETED"
RIDE_STATUS_CANCELLED = "CANCELLED"
RIDE_STATUS_EXPIRED = "EXPIRED"

ACTIVE_RIDE_STATUSES = [
    RIDE_STATUS_REQUESTED,
    RIDE_STATUS_ACCEPTED_PENDING_QUOTE,
    RIDE_STATUS_QUOTE_SENT,
    RIDE_STATUS_QUOTE_ACCEPTED,
    RIDE_STATUS_DRIVER_EN_ROUTE,
    RIDE_STATUS_IN_PROGRESS,
]

TRANSITIONS = {
    RIDE_STATUS_REQUESTED: {RIDE_STATUS_ACCEPTED_PENDING_QUOTE, RIDE_STATUS_CANCELLED, RIDE_STATUS_EXPIRED},
    RIDE_STATUS_ACCEPTED_PENDING_QUOTE: {RIDE_STATUS_QUOTE_SENT, RIDE_STATUS_CANCELLED, RIDE_STATUS_EXPIRED},
    RIDE_STATUS_QUOTE_SENT: {RIDE_STATUS_QUOTE_ACCEPTED, RIDE_STATUS_CANCELLED, RIDE_STATUS_EXPIRED},
    RIDE_STATUS_QUOTE_ACCEPTED: {
        RIDE_STATUS_DRIVER_EN_ROUTE,
        RIDE_STATUS_IN_PROGRESS,
        RIDE_STATUS_COMPLETED,
        RIDE_STATUS_CANCELLED,
    },
    RIDE_STATUS_DRIVER_EN_ROUTE: {RIDE_STATUS_IN_PROGRESS, RIDE_STATUS_COMPLETED, RIDE_STATUS_CANCELLED},
    RIDE_STATUS_IN_PROGRESS: {RIDE_STATUS_COMPLETED, RIDE_STATUS_CANCELLED},
    RIDE_STATUS_COMPLETED: set(),
    RIDE_STATUS_CANCELLED: set(),
    RIDE_STATUS_EXPIRED: set(),
}


def utcnow_iso():
    return datetime.utcnow().isoformat()


def normalize_city_key(city):
    if not city:
        return ""
    value = str(city).strip().lower()
    value = re.sub(r"[^a-z0-9\s]", " ", value)
    value = re.sub(
        r"\b(city|district|division|municipal|corporation|metropolitan|region)\b",
        " ",
        value,
    )
    value = re.sub(r"\s+", " ", value).strip()
    return value


def serialize_doc(doc):
    data = doc.to_dict()
    data["id"] = doc.id
    return data


def can_transition(current_status, target_status):
    return target_status in TRANSITIONS.get(current_status, set())


def is_cab_driver_user(user_data):
    if not user_data:
        return False
    if user_data.get("role") != "BUSINESS":
        return False
    profile = user_data.get("business_profile") or {}
    return profile.get("business_type") == "CAB_DRIVER"


def get_user_doc(uid):
    db = get_firestore_client()
    doc = db.collection("users").document(uid).get()
    if not doc.exists:
        return None
    return doc.to_dict()


def get_active_ride_for_traveler(uid):
    db = get_firestore_client()
    query = db.collection("rides").where("traveler_uid", "==", uid)
    for doc in query.stream():
        data = doc.to_dict()
        if data.get("status") in ACTIVE_RIDE_STATUSES:
            data["id"] = doc.id
            return data
    return None


def get_active_ride_for_driver(uid):
    db = get_firestore_client()
    query = db.collection("rides").where("driver_uid", "==", uid)
    for doc in query.stream():
        data = doc.to_dict()
        if data.get("status") in ACTIVE_RIDE_STATUSES:
            data["id"] = doc.id
            return data
    return None


def add_ride_event(db, ride_id, event_type, actor_uid, payload=None):
    db.collection("ride_events").add(
        {
            "ride_id": ride_id,
            "event_type": event_type,
            "actor_uid": actor_uid,
            "payload": payload or {},
            "timestamp": utcnow_iso(),
        }
    )


def haversine_km(lat1, lon1, lat2, lon2):
    radius_km = 6371.0
    d_lat = math.radians(lat2 - lat1)
    d_lon = math.radians(lon2 - lon1)
    a = (
        math.sin(d_lat / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(d_lon / 2) ** 2
    )
    return 2 * radius_km * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def estimate_eta_minutes(source, target, avg_speed_kmph=25.0):
    if not source or not target:
        return None
    try:
        lat1 = float(source["lat"])
        lng1 = float(source["lng"])
        lat2 = float(target["lat"])
        lng2 = float(target["lng"])
    except (TypeError, ValueError, KeyError):
        return None

    distance_km = haversine_km(lat1, lng1, lat2, lng2)
    if avg_speed_kmph <= 0:
        return None
    minutes = (distance_km / avg_speed_kmph) * 60.0
    return max(1, int(round(minutes)))
