"""
Search Blueprint — Hotel and tour search with Redis caching.
"""

from flask import Blueprint, request
from app.utils.auth import require_auth
from app.utils.responses import success_response
from app.services.firebase_service import get_firestore_client
from app.services.redis_service import cache_get, cache_set

search_bp = Blueprint("search", __name__, url_prefix="/api/search")


@search_bp.route("/hotels", methods=["GET"])
@require_auth
def search_hotels():
    """Search hotels with filters. Results served from Redis cache when available."""
    destination = request.args.get("destination", "")
    price_min = request.args.get("price_min")
    price_max = request.args.get("price_max")
    rating = request.args.get("rating")

    # Check cache
    cache_key = f"hotels:{destination}:{price_min}:{price_max}:{rating}"
    cached = cache_get(cache_key)
    if cached:
        return success_response(cached)

    # Query Firestore
    db = get_firestore_client()
    query = db.collection("properties")

    if destination:
        query = query.where("location", "==", destination)

    hotels = []
    for doc in query.stream():
        hotel = doc.to_dict()
        hotel["id"] = doc.id

        # Client-side filtering for price/rating (Firestore limits compound queries)
        if price_min and hotel.get("price_per_night", 0) < float(price_min):
            continue
        if price_max and hotel.get("price_per_night", 0) > float(price_max):
            continue
        if rating and hotel.get("rating", 0) < float(rating):
            continue

        hotels.append(hotel)

    # Cache results for 5 minutes
    cache_set(cache_key, hotels, ttl=300)

    return success_response(hotels)


@search_bp.route("/tours", methods=["GET"])
@require_auth
def search_tours():
    """Search tours with filters. Results served from Redis cache when available."""
    destination = request.args.get("destination", "")
    category = request.args.get("category", "")
    date = request.args.get("date", "")

    cache_key = f"tours:{destination}:{category}:{date}"
    cached = cache_get(cache_key)
    if cached:
        return success_response(cached)

    db = get_firestore_client()
    query = db.collection("tours")

    if destination:
        query = query.where("destination", "==", destination)
    if category:
        query = query.where("category_tags", "array_contains", category)

    tours = []
    for doc in query.stream():
        tour = doc.to_dict()
        tour["id"] = doc.id
        tours.append(tour)

    cache_set(cache_key, tours, ttl=300)

    return success_response(tours)
