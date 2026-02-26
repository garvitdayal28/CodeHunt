"""
Search Blueprint.
Hotels: internal BUSINESS/HOTEL inventory with availability-aware filters.
Tours: Firestore search with Redis cache.
"""

import logging
from datetime import datetime

from flask import Blueprint, request

from app.services.firebase_service import get_firestore_client
from app.services.redis_service import cache_get, cache_set
from app.utils.responses import error_response, success_response

logger = logging.getLogger(__name__)

search_bp = Blueprint("search", __name__, url_prefix="/api/search")

DATE_FMT = "%Y-%m-%d"
BOOKED_STATUSES = {"CONFIRMED", "LATE_ARRIVAL", "CHECKED_IN"}


def _parse_date(value):
    if not value:
        return None
    try:
        return datetime.strptime(str(value), DATE_FMT).date()
    except (TypeError, ValueError):
        return None


def _parse_int(value, default=0, minimum=0):
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        return default
    return max(minimum, parsed)


def _parse_float(value):
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _to_float(value, fallback=0.0):
    try:
        return float(value)
    except (TypeError, ValueError):
        return fallback


def _to_int(value, fallback=0):
    try:
        return int(value)
    except (TypeError, ValueError):
        return fallback


def _dates_overlap(check_in_a, check_out_a, check_in_b, check_out_b):
    # Treat checkout as exclusive boundary.
    return check_in_a < check_out_b and check_in_b < check_out_a


def _normalize_text(value):
    return str(value or "").strip().lower()


def _extract_itinerary_id(booking_doc):
    parent = booking_doc.reference.parent.parent
    return parent.id if parent else None


def _is_business_hotel_user(user_data):
    business_profile = user_data.get("business_profile") or {}
    return (
        user_data.get("role") == "BUSINESS"
        and business_profile.get("business_type") == "HOTEL"
    )


def _build_hotel_profile(user_doc):
    user_data = user_doc.to_dict() or {}
    business_profile = user_data.get("business_profile") or {}
    details = business_profile.get("details") or {}
    image_urls = details.get("image_urls") or []

    return {
        "id": user_doc.id,
        "hotel_owner_uid": user_doc.id,
        "name": business_profile.get("business_name") or user_data.get("display_name") or "Hotel",
        "location": business_profile.get("city") or "",
        "address": business_profile.get("address") or "",
        "description": business_profile.get("description") or "",
        "amenities": details.get("amenities") or [],
        "image_urls": image_urls,
        "image_url": image_urls[0] if image_urls else "",
        "source": "business_hotel",
    }


def _get_room_types(db, hotel_uid):
    rooms = []
    for room_doc in db.collection("users").document(hotel_uid).collection("room_types").stream():
        room = room_doc.to_dict() or {}
        if room.get("is_active") is False:
            continue
        room["id"] = room_doc.id
        rooms.append(room)
    return rooms


def _get_overlapping_bookings(db, hotel_uid, checkin=None, checkout=None):
    bookings = []
    for itinerary_doc in db.collection("itineraries").stream():
        itinerary_id = itinerary_doc.id
        for booking_doc in db.collection("itineraries").document(itinerary_id).collection("bookings").stream():
            booking = booking_doc.to_dict() or {}
            if booking.get("hotel_owner_uid") != hotel_uid:
                continue
            if booking.get("status") not in BOOKED_STATUSES:
                continue

            if checkin and checkout:
                booking_checkin = _parse_date(booking.get("check_in_date"))
                booking_checkout = _parse_date(booking.get("check_out_date"))
                if not booking_checkin or not booking_checkout:
                    continue
                if not _dates_overlap(booking_checkin, booking_checkout, checkin, checkout):
                    continue

            booking["id"] = booking_doc.id
            booking["itinerary_id"] = itinerary_id
            bookings.append(booking)

    return bookings


def _calculate_available_rooms(room, bookings, checkin=None, checkout=None):
    total_rooms = _to_int(room.get("total_rooms"), 0)
    if total_rooms <= 0:
        return 0

    # If date range is not provided, use tracked current availability when present.
    if not checkin or not checkout:
        current_available = room.get("room_count_available")
        if current_available is None:
            return total_rooms
        return max(0, _to_int(current_available, total_rooms))

    booked_count = 0
    for booking in bookings:
        if booking.get("room_type_id") != room.get("id"):
            continue
        booked_count += _to_int(booking.get("rooms_booked"), 1)

    return max(0, total_rooms - booked_count)


def _hotel_matches_destination(hotel_profile, destination):
    if not destination:
        return True

    normalized = _normalize_text(destination)
    haystack = " ".join(
        [
            _normalize_text(hotel_profile.get("name")),
            _normalize_text(hotel_profile.get("location")),
            _normalize_text(hotel_profile.get("address")),
        ]
    )
    return normalized in haystack


def _sort_hotels(hotels, sort_by):
    if sort_by == "price_desc":
        return sorted(hotels, key=lambda h: _to_float((h.get("price_range") or {}).get("min")), reverse=True)
    if sort_by == "rooms_desc":
        return sorted(hotels, key=lambda h: _to_int(h.get("total_available_rooms")), reverse=True)
    if sort_by == "rooms_asc":
        return sorted(hotels, key=lambda h: _to_int(h.get("total_available_rooms")))
    if sort_by == "name_desc":
        return sorted(hotels, key=lambda h: _normalize_text(h.get("name")), reverse=True)
    if sort_by == "name_asc":
        return sorted(hotels, key=lambda h: _normalize_text(h.get("name")))
    # Default sort.
    return sorted(hotels, key=lambda h: _to_float((h.get("price_range") or {}).get("min")))


def _sort_rooms(rooms, sort_by):
    if sort_by == "price_desc":
        return sorted(rooms, key=lambda room: _to_float(room.get("price_per_day")), reverse=True)
    if sort_by == "rooms_desc":
        return sorted(rooms, key=lambda room: _to_int(room.get("available_rooms")), reverse=True)
    if sort_by == "name_desc":
        return sorted(rooms, key=lambda room: _normalize_text(room.get("name")), reverse=True)
    if sort_by == "name_asc":
        return sorted(rooms, key=lambda room: _normalize_text(room.get("name")))
    return sorted(rooms, key=lambda room: _to_float(room.get("price_per_day")))


@search_bp.route("/hotels", methods=["GET"])
def search_hotels():
    """
    Search hotels from internal BUSINESS/HOTEL inventory.
    Supports destination/date/occupancy/price filters and sort options.
    """
    destination = request.args.get("destination", "").strip()
    checkin_raw = request.args.get("checkin")
    checkout_raw = request.args.get("checkout")
    sort_by = request.args.get("sort_by", "price_asc").strip()

    checkin = _parse_date(checkin_raw)
    checkout = _parse_date(checkout_raw)
    if (checkin_raw or checkout_raw) and (not checkin or not checkout):
        return error_response("INVALID_DATES", "checkin and checkout must be valid dates in YYYY-MM-DD format.", 400)
    if checkin and checkout and checkout <= checkin:
        return error_response("INVALID_DATES", "checkout must be after checkin.", 400)

    rooms_requested = _parse_int(request.args.get("rooms"), default=1, minimum=1)
    adults = _parse_int(request.args.get("adults"), default=2, minimum=0)
    children = _parse_int(request.args.get("children"), default=0, minimum=0)
    guests_needed = adults + children
    price_min = _parse_float(request.args.get("price_min"))
    price_max = _parse_float(request.args.get("price_max"))

    cache_key = (
        f"hotels:internal:{destination}:{checkin_raw}:{checkout_raw}:{rooms_requested}:"
        f"{adults}:{children}:{price_min}:{price_max}:{sort_by}"
    )
    cached = cache_get(cache_key)
    if cached is not None:
        return success_response(cached)

    db = get_firestore_client()
    hotels = []

    for user_doc in db.collection("users").where("role", "==", "BUSINESS").stream():
        user_data = user_doc.to_dict() or {}
        if not _is_business_hotel_user(user_data):
            continue

        hotel_profile = _build_hotel_profile(user_doc)
        if not _hotel_matches_destination(hotel_profile, destination):
            continue

        rooms = _get_room_types(db, user_doc.id)
        if not rooms:
            continue

        overlapping_bookings = _get_overlapping_bookings(db, user_doc.id, checkin, checkout) if (checkin and checkout) else []

        total_rooms = 0
        total_available_rooms = 0
        prices = []
        has_matching_capacity = False

        for room in rooms:
            total_rooms += _to_int(room.get("total_rooms"), 0)
            available_rooms = _calculate_available_rooms(room, overlapping_bookings, checkin, checkout)
            total_available_rooms += available_rooms

            price = _to_float(room.get("price_per_day"), 0.0)
            if price > 0:
                prices.append(price)

            capacity = _to_int(room.get("max_guests"), max(2, _to_int(room.get("beds"), 1) * 2))
            if available_rooms >= rooms_requested and (guests_needed <= 0 or capacity >= guests_needed):
                has_matching_capacity = True

        if not prices:
            continue

        min_price = min(prices)
        max_price_value = max(prices)

        if price_min is not None and min_price < price_min:
            continue
        if price_max is not None and min_price > price_max:
            continue
        if total_available_rooms < rooms_requested:
            continue
        if guests_needed > 0 and not has_matching_capacity:
            continue

        hotels.append(
            {
                **hotel_profile,
                "price_range": {"min": int(round(min_price)), "max": int(round(max_price_value))},
                "price_per_night": int(round(min_price)),
                "total_rooms": total_rooms,
                "total_available_rooms": total_available_rooms,
                "star_rating": 0,
            }
        )

    hotels = _sort_hotels(hotels, sort_by)
    cache_set(cache_key, hotels, ttl=180)
    return success_response(hotels)


@search_bp.route("/hotels/<hotel_uid>/rooms", methods=["GET"])
def get_hotel_rooms(hotel_uid):
    """Get a hotel profile and room cards with availability-aware filtering."""
    checkin_raw = request.args.get("checkin")
    checkout_raw = request.args.get("checkout")
    sort_by = request.args.get("sort_by", "price_asc").strip()

    checkin = _parse_date(checkin_raw)
    checkout = _parse_date(checkout_raw)
    if (checkin_raw or checkout_raw) and (not checkin or not checkout):
        return error_response("INVALID_DATES", "checkin and checkout must be valid dates in YYYY-MM-DD format.", 400)
    if checkin and checkout and checkout <= checkin:
        return error_response("INVALID_DATES", "checkout must be after checkin.", 400)

    rooms_requested = _parse_int(request.args.get("rooms"), default=1, minimum=1)
    adults = _parse_int(request.args.get("adults"), default=2, minimum=0)
    children = _parse_int(request.args.get("children"), default=0, minimum=0)
    guests_needed = adults + children
    price_min = _parse_float(request.args.get("price_min"))
    price_max = _parse_float(request.args.get("price_max"))

    cache_key = (
        f"hotel_rooms:{hotel_uid}:{checkin_raw}:{checkout_raw}:{rooms_requested}:"
        f"{adults}:{children}:{price_min}:{price_max}:{sort_by}"
    )
    cached = cache_get(cache_key)
    if cached is not None:
        return success_response(cached)

    db = get_firestore_client()
    user_doc = db.collection("users").document(hotel_uid).get()
    if not user_doc.exists:
        return error_response("NOT_FOUND", "Hotel not found.", 404)

    user_data = user_doc.to_dict() or {}
    if not _is_business_hotel_user(user_data):
        return error_response("NOT_FOUND", "Hotel not found.", 404)

    hotel_profile = _build_hotel_profile(user_doc)
    rooms = _get_room_types(db, hotel_uid)
    overlapping_bookings = _get_overlapping_bookings(db, hotel_uid, checkin, checkout) if (checkin and checkout) else []

    room_cards = []
    prices = []
    total_rooms = 0
    total_available = 0

    for room in rooms:
        total_room_count = _to_int(room.get("total_rooms"), 0)
        available_rooms = _calculate_available_rooms(room, overlapping_bookings, checkin, checkout)
        total_rooms += total_room_count
        total_available += available_rooms

        max_guests = _to_int(room.get("max_guests"), max(2, _to_int(room.get("beds"), 1) * 2))
        if guests_needed > 0 and max_guests < guests_needed:
            continue
        if available_rooms < rooms_requested:
            continue

        price_per_day = _to_float(room.get("price_per_day"), 0.0)
        if price_per_day <= 0:
            continue

        if price_min is not None and price_per_day < price_min:
            continue
        if price_max is not None and price_per_day > price_max:
            continue

        availability_status = "AVAILABLE"
        if available_rooms == 0:
            availability_status = "SOLD_OUT"
        elif available_rooms <= rooms_requested:
            availability_status = "LIMITED"

        prices.append(price_per_day)
        room_cards.append(
            {
                "id": room.get("id"),
                "name": room.get("name") or "Room",
                "description": room.get("description") or "",
                "price_per_day": int(round(price_per_day)),
                "total_rooms": total_room_count,
                "available_rooms": available_rooms,
                "beds": _to_int(room.get("beds"), 1),
                "max_guests": max_guests,
                "area_sqft": room.get("area_sqft"),
                "amenities": room.get("amenities") or [],
                "images": room.get("images") or [],
                "cover_image": room.get("cover_image") or ((room.get("images") or [None])[0]),
                "availability_status": availability_status,
            }
        )

    room_cards = _sort_rooms(room_cards, sort_by)
    min_price = int(round(min(prices))) if prices else 0
    max_price_value = int(round(max(prices))) if prices else 0

    payload = {
        "hotel": {
            **hotel_profile,
            "price_range": {"min": min_price, "max": max_price_value},
            "price_per_night": min_price,
            "total_rooms": total_rooms,
            "total_available_rooms": total_available,
            "star_rating": 0,
        },
        "rooms": room_cards,
        "filters": {
            "checkin": checkin_raw,
            "checkout": checkout_raw,
            "rooms": rooms_requested,
            "adults": adults,
            "children": children,
            "price_min": price_min,
            "price_max": price_max,
            "sort_by": sort_by,
        },
    }

    cache_set(cache_key, payload, ttl=120)
    return success_response(payload)


@search_bp.route("/tours", methods=["GET"])
def search_tours():
    """Search tours with filters. Results served from Redis cache when available."""
    destination = request.args.get("destination", "")
    category = request.args.get("category", "")
    date = request.args.get("date", "")

    cache_key = f"tours:{destination}:{category}:{date}"
    cached = cache_get(cache_key)
    if cached:
        return success_response(cached)

    try:
        db = get_firestore_client()
        query = db.collection("tours")

        if destination:
            query = query.where("location", "==", destination)
        if category:
            query = query.where("category", "array_contains", category)

        tours = []
        for doc in query.stream():
            tour = doc.to_dict()
            tour["id"] = doc.id
            tours.append(tour)

        cache_set(cache_key, tours, ttl=300)
        return success_response(tours)
    except Exception as e:
        logger.warning(f"Tour search failed: {e}")
        return success_response([])


# ─── Restaurant Search ────────────────────────────────────────────────────────


def _is_business_restaurant_user(user_data):
    business_profile = user_data.get("business_profile") or {}
    return (
        user_data.get("role") == "BUSINESS"
        and business_profile.get("business_type") == "RESTAURANT"
    )


def _build_restaurant_profile(user_doc):
    user_data = user_doc.to_dict() or {}
    business_profile = user_data.get("business_profile") or {}
    details = business_profile.get("details") or {}
    image_urls = details.get("image_urls") or []

    return {
        "id": user_doc.id,
        "restaurant_owner_uid": user_doc.id,
        "name": business_profile.get("business_name") or user_data.get("display_name") or "Restaurant",
        "location": business_profile.get("city") or "",
        "address": business_profile.get("address") or "",
        "description": business_profile.get("description") or "",
        "cuisine": details.get("cuisine") or "",
        "opening_hours": details.get("opening_hours") or "",
        "seating_capacity": details.get("seating_capacity") or 0,
        "image_urls": image_urls,
        "image_url": image_urls[0] if image_urls else "",
        "source": "business_restaurant",
    }


def _restaurant_matches_destination(restaurant_profile, destination):
    if not destination:
        return True
    normalized = _normalize_text(destination)
    haystack = " ".join(
        [
            _normalize_text(restaurant_profile.get("name")),
            _normalize_text(restaurant_profile.get("location")),
            _normalize_text(restaurant_profile.get("address")),
        ]
    )
    return normalized in haystack


def _sort_restaurants(restaurants, sort_by):
    if sort_by == "name_desc":
        return sorted(restaurants, key=lambda r: _normalize_text(r.get("name")), reverse=True)
    if sort_by == "name_asc":
        return sorted(restaurants, key=lambda r: _normalize_text(r.get("name")))
    return sorted(restaurants, key=lambda r: _normalize_text(r.get("name")))


@search_bp.route("/restaurants", methods=["GET"])
def search_restaurants():
    """
    Search restaurants from internal BUSINESS/RESTAURANT inventory.
    """
    destination = request.args.get("destination", "").strip()
    cuisine = request.args.get("cuisine", "").strip()
    sort_by = request.args.get("sort_by", "name_asc").strip()

    cache_key = f"restaurants:internal:{destination}:{cuisine}:{sort_by}"
    cached = cache_get(cache_key)
    if cached is not None:
        return success_response(cached)

    db = get_firestore_client()
    restaurants = []

    for user_doc in db.collection("users").where("role", "==", "BUSINESS").stream():
        user_data = user_doc.to_dict() or {}
        if not _is_business_restaurant_user(user_data):
            continue

        restaurant_profile = _build_restaurant_profile(user_doc)
        if not _restaurant_matches_destination(restaurant_profile, destination):
            continue

        if cuisine:
            profile_cuisine = _normalize_text(restaurant_profile.get("cuisine"))
            if _normalize_text(cuisine) not in profile_cuisine:
                continue

        # Get a count/summary of menu items, maybe minimum price
        menu_items = []
        for menu_doc in db.collection("users").document(user_doc.id).collection("menu_items").stream():
            item = menu_doc.to_dict() or {}
            if item.get("is_available") is False:
                continue
            menu_items.append(item)

        total_menu_items = len(menu_items)
        prices = [_to_float(i.get("price")) for i in menu_items if _to_float(i.get("price")) > 0]
        min_price = min(prices) if prices else 0
        max_price_value = max(prices) if prices else 0

        restaurants.append(
            {
                **restaurant_profile,
                "total_menu_items": total_menu_items,
                "price_range": {"min": int(round(min_price)), "max": int(round(max_price_value))},
                "star_rating": 0,
            }
        )

    restaurants = _sort_restaurants(restaurants, sort_by)
    cache_set(cache_key, restaurants, ttl=180)
    return success_response(restaurants)


@search_bp.route("/restaurants/<restaurant_uid>/menu", methods=["GET"])
def get_restaurant_menu(restaurant_uid):
    """Get a restaurant profile and its active menu items."""
    cache_key = f"restaurant_menu:{restaurant_uid}"
    cached = cache_get(cache_key)
    if cached is not None:
        return success_response(cached)

    db = get_firestore_client()
    user_doc = db.collection("users").document(restaurant_uid).get()
    if not user_doc.exists:
        return error_response("NOT_FOUND", "Restaurant not found.", 404)

    user_data = user_doc.to_dict() or {}
    if not _is_business_restaurant_user(user_data):
        return error_response("NOT_FOUND", "Restaurant not found.", 404)

    restaurant_profile = _build_restaurant_profile(user_doc)

    menu_items = []
    prices = []
    categories = set()
    for menu_doc in db.collection("users").document(restaurant_uid).collection("menu_items").stream():
        item = menu_doc.to_dict() or {}
        if item.get("is_available") is False: # we can filter available or unavailable here
             continue
        item["id"] = menu_doc.id
        menu_items.append(item)
        if item.get("price", 0) > 0:
            prices.append(item.get("price"))
        if item.get("category"):
            categories.add(item.get("category").strip())

    menu_items.sort(key=lambda item: _normalize_text(item.get("name")))

    min_price = int(round(min(prices))) if prices else 0
    max_price_value = int(round(max(prices))) if prices else 0

    payload = {
        "restaurant": {
            **restaurant_profile,
            "total_menu_items": len(menu_items),
            "price_range": {"min": min_price, "max": max_price_value},
            "star_rating": 0,
            "categories": sorted(list(categories)),
        },
        "menu_items": menu_items,
    }

    cache_set(cache_key, payload, ttl=120)
    return success_response(payload)
