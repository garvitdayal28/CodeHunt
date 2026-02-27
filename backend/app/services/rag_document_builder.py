"""Builds normalized RAG documents from Firestore business/tour data."""

import logging
import time

from google.api_core.exceptions import ResourceExhausted

from app.services.firebase_service import get_firestore_client

logger = logging.getLogger(__name__)

ENTITY_HOTEL = "HOTEL"
ENTITY_RESTAURANT = "RESTAURANT"
ENTITY_TOUR = "TOUR"
ENTITY_GUIDE_SERVICE = "GUIDE_SERVICE"


def _string(value):
    return str(value or "").strip()


def _string_list(value):
    if isinstance(value, list):
        return [str(item).strip() for item in value if str(item).strip()]
    if isinstance(value, str):
        return [item.strip() for item in value.split(",") if item.strip()]
    return []


def _retry_stream(collection_ref, max_retries=3, base_delay=2.0):
    """Stream a Firestore collection with retry on quota exhaustion."""
    for attempt in range(max_retries):
        try:
            return list(collection_ref.stream())
        except ResourceExhausted:
            if attempt < max_retries - 1:
                delay = base_delay * (2 ** attempt)
                logger.warning("[RAG_DOC] Firestore quota exceeded, retrying in %.1fs (attempt %d/%d)", delay, attempt + 1, max_retries)
                time.sleep(delay)
            else:
                logger.error("[RAG_DOC] Firestore quota exceeded after %d retries, returning empty", max_retries)
                return []


def _hotel_doc(uid, data):
    profile = (data or {}).get("business_profile") or {}
    details = profile.get("details") or {}
    business_name = _string(profile.get("business_name") or data.get("display_name")) or "Hotel"
    city = _string(profile.get("city"))
    amenities = _string_list(details.get("amenities"))

    room_docs = []
    db = get_firestore_client()
    for room_doc in _retry_stream(db.collection("users").document(uid).collection("room_types")):
        room = room_doc.to_dict() or {}
        if room.get("is_active") is False:
            continue
        room_docs.append(
            {
                "name": _string(room.get("name")),
                "price_per_day": room.get("price_per_day"),
                "max_guests": room.get("max_guests"),
                "amenities": _string_list(room.get("amenities")),
            }
        )

    room_lines = []
    for room in room_docs[:10]:
        room_lines.append(
            f"{room['name']} | INR {room.get('price_per_day', 0)} | max {room.get('max_guests', 0)} guests | amenities: {', '.join(room.get('amenities') or [])}"
        )

    text_parts = [
        f"Hotel: {business_name}",
        f"City: {city}",
        f"Address: {_string(profile.get('address'))}",
        f"Description: {_string(profile.get('description'))}",
        f"Amenities: {', '.join(amenities)}",
        f"Rooms: {' || '.join(room_lines)}",
    ]
    text = "\n".join(part for part in text_parts if part.strip())
    return {
        "vector_id": f"HOTEL:{uid}",
        "entity_type": ENTITY_HOTEL,
        "entity_id": uid,
        "title": business_name,
        "text": text,
        "metadata": {
            "entity_type": ENTITY_HOTEL,
            "city": city,
            "location": city,
            "source_uid": uid,
            "tags": amenities,
        },
    }


def _restaurant_doc(uid, data):
    profile = (data or {}).get("business_profile") or {}
    details = profile.get("details") or {}
    business_name = _string(profile.get("business_name") or data.get("display_name")) or "Restaurant"
    city = _string(profile.get("city"))
    cuisine = _string(details.get("cuisine"))

    db = get_firestore_client()
    menu_lines = []
    for menu_doc in _retry_stream(db.collection("users").document(uid).collection("menu_items")):
        item = menu_doc.to_dict() or {}
        if item.get("is_available") is False:
            continue
        menu_lines.append(f"{_string(item.get('name'))} ({_string(item.get('category'))}) INR {item.get('price', 0)}")

    text_parts = [
        f"Restaurant: {business_name}",
        f"City: {city}",
        f"Address: {_string(profile.get('address'))}",
        f"Description: {_string(profile.get('description'))}",
        f"Cuisine: {cuisine}",
        f"Menu: {' || '.join(menu_lines[:25])}",
    ]
    text = "\n".join(part for part in text_parts if part.strip())
    return {
        "vector_id": f"RESTAURANT:{uid}",
        "entity_type": ENTITY_RESTAURANT,
        "entity_id": uid,
        "title": business_name,
        "text": text,
        "metadata": {
            "entity_type": ENTITY_RESTAURANT,
            "city": city,
            "location": city,
            "source_uid": uid,
            "tags": [cuisine] if cuisine else [],
        },
    }


def _tour_doc(tour_id, data):
    location = _string(data.get("location") or data.get("destination"))
    category = _string_list(data.get("category")) + _string_list(data.get("category_tags"))
    text_parts = [
        f"Tour: {_string(data.get('name'))}",
        f"Location: {location}",
        f"Description: {_string(data.get('description'))}",
        f"Duration: {data.get('duration_hours', '')} hours",
        f"Price: INR {data.get('price', 0)}",
        f"Category: {', '.join(category)}",
        f"Operator: {_string(data.get('operator_name') or data.get('operator_uid'))}",
    ]
    text = "\n".join(part for part in text_parts if part.strip())
    return {
        "vector_id": f"TOUR:{tour_id}",
        "entity_type": ENTITY_TOUR,
        "entity_id": tour_id,
        "title": _string(data.get("name")) or "Tour",
        "text": text,
        "metadata": {
            "entity_type": ENTITY_TOUR,
            "city": location,
            "location": location,
            "source_uid": _string(data.get("operator_uid")),
            "tags": category,
        },
    }


def _guide_doc(owner_uid, service_id, data):
    location = _string(data.get("location") or data.get("business_city"))
    category = _string_list(data.get("category"))
    entity_id = f"{owner_uid}:{service_id}"
    text_parts = [
        f"Guide service: {_string(data.get('name'))}",
        f"Location: {location}",
        f"Description: {_string(data.get('description'))}",
        f"Service type: {_string(data.get('service_type'))}",
        f"Duration: {data.get('duration_hours', '')} hours",
        f"Price: INR {data.get('price', 0)}",
        f"Category: {', '.join(category)}",
        f"Provider: {_string(data.get('owner_display_name') or data.get('business_name'))}",
    ]
    text = "\n".join(part for part in text_parts if part.strip())
    return {
        "vector_id": f"GUIDE_SERVICE:{entity_id}",
        "entity_type": ENTITY_GUIDE_SERVICE,
        "entity_id": entity_id,
        "title": _string(data.get("name")) or "Guide Service",
        "text": text,
        "metadata": {
            "entity_type": ENTITY_GUIDE_SERVICE,
            "city": location,
            "location": location,
            "source_uid": owner_uid,
            "tags": category,
        },
    }


def build_all_documents():
    """Build all documents used by RAG indexing."""
    db = get_firestore_client()
    docs = []

    for user_doc in _retry_stream(db.collection("users").where("role", "==", "BUSINESS")):
        user = user_doc.to_dict() or {}
        profile = user.get("business_profile") or {}
        business_type = _string(profile.get("business_type"))
        if business_type == "HOTEL":
            docs.append(_hotel_doc(user_doc.id, user))
        elif business_type == "RESTAURANT":
            docs.append(_restaurant_doc(user_doc.id, user))

    for tour_doc in _retry_stream(db.collection("tours")):
        docs.append(_tour_doc(tour_doc.id, tour_doc.to_dict() or {}))

    for guide_doc in _retry_stream(db.collection_group("guide_services")):
        guide = guide_doc.to_dict() or {}
        if guide.get("is_active") is False:
            continue
        owner_uid = _string(guide.get("owner_uid") or guide_doc.reference.parent.parent.id)
        service_id = _string(guide.get("id") or guide_doc.id)
        docs.append(_guide_doc(owner_uid, service_id, guide))

    return docs


def build_entity_document(entity_type, entity_id):
    """Build one document by entity type/id. Returns None if not found."""
    entity_type = _string(entity_type).upper()
    db = get_firestore_client()

    if entity_type in {ENTITY_HOTEL, ENTITY_RESTAURANT}:
        user_doc = db.collection("users").document(entity_id).get()
        if not user_doc.exists:
            return None
        user = user_doc.to_dict() or {}
        profile = user.get("business_profile") or {}
        business_type = _string(profile.get("business_type"))
        if entity_type == ENTITY_HOTEL and business_type == "HOTEL":
            return _hotel_doc(entity_id, user)
        if entity_type == ENTITY_RESTAURANT and business_type == "RESTAURANT":
            return _restaurant_doc(entity_id, user)
        return None

    if entity_type == ENTITY_TOUR:
        doc = db.collection("tours").document(entity_id).get()
        if not doc.exists:
            return None
        return _tour_doc(entity_id, doc.to_dict() or {})

    if entity_type == ENTITY_GUIDE_SERVICE:
        if ":" not in entity_id:
            return None
        owner_uid, service_id = entity_id.split(":", 1)
        doc = db.collection("users").document(owner_uid).collection("guide_services").document(service_id).get()
        if not doc.exists:
            return None
        return _guide_doc(owner_uid, service_id, doc.to_dict() or {})

    return None
