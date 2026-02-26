"""
Search Blueprint — Hotel and tour search with Redis caching.
Hotels: Uses RapidAPI Booking.com with Firestore fallback.
Tours: Uses Firestore directly.
"""

import logging
from flask import Blueprint, request
from app.utils.responses import success_response
from app.services.redis_service import cache_get, cache_set
from app.services.hotel_api_service import search_hotels_external, is_api_configured

logger = logging.getLogger(__name__)

search_bp = Blueprint("search", __name__, url_prefix="/api/search")


@search_bp.route("/hotels", methods=["GET"])
def search_hotels():
    """
    Search hotels. Tries RapidAPI Booking.com first, falls back to Firestore.
    Results are cached in Redis for 15 minutes.
    """
    destination = request.args.get("destination", "")
    checkin = request.args.get("checkin")
    checkout = request.args.get("checkout")
    price_min = request.args.get("price_min")
    price_max = request.args.get("price_max")
    rating = request.args.get("rating")

    # Check cache first
    cache_key = f"hotels:{destination}:{checkin}:{checkout}:{price_min}:{price_max}:{rating}"
    cached = cache_get(cache_key)
    if cached:
        return success_response(cached)

    hotels = None

    # Try external API first
    if is_api_configured() and destination:
        try:
            hotels = search_hotels_external(destination, checkin, checkout)
            if hotels:
                logger.info(f"Booking.com API returned {len(hotels)} hotels for '{destination}'")
        except Exception as e:
            logger.warning(f"External hotel API failed: {e}")

    # Fallback to Firestore
    if hotels is None:
        try:
            from app.services.firebase_service import get_firestore_client
            db = get_firestore_client()
            query = db.collection("properties")

            if destination:
                query = query.where("location", "==", destination)

            hotels = []
            for doc in query.stream():
                hotel = doc.to_dict()
                hotel["id"] = doc.id
                hotel["source"] = "firestore"

                if price_min and hotel.get("price_per_night", 0) < float(price_min):
                    continue
                if price_max and hotel.get("price_per_night", 0) > float(price_max):
                    continue
                if rating and hotel.get("rating", 0) < float(rating):
                    continue

                hotels.append(hotel)

            logger.info(f"Firestore returned {len(hotels)} hotels for '{destination}'")
        except Exception as e:
            logger.warning(f"Firestore hotel fallback also failed: {e}")
            hotels = []

    # Cache results for 15 minutes
    cache_set(cache_key, hotels, ttl=900)

    return success_response(hotels)


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
        from app.services.firebase_service import get_firestore_client
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
