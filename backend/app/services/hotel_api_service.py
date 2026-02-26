"""
Hotel API Service — RapidAPI Booking.com integration.
Searches real hotel data from Booking.com via RapidAPI,
with Redis caching and Firestore fallback.
"""

import os
import requests
import logging

logger = logging.getLogger(__name__)

RAPIDAPI_KEY = os.environ.get("RAPIDAPI_KEY", "")
RAPIDAPI_HOST = "booking-com15.p.rapidapi.com"
BASE_URL = f"https://{RAPIDAPI_HOST}"

HEADERS = {
    "x-rapidapi-key": RAPIDAPI_KEY,
    "x-rapidapi-host": RAPIDAPI_HOST,
}


def is_api_configured():
    """Check if the RapidAPI key is set."""
    return bool(RAPIDAPI_KEY)


def search_destination(query):
    """
    Search for a destination ID to use in hotel search.
    Returns the first matching dest_id and dest_type, or None.
    """
    if not is_api_configured():
        return None

    try:
        resp = requests.get(
            f"{BASE_URL}/api/v1/hotels/searchDestination",
            headers=HEADERS,
            params={"query": query},
            timeout=10,
        )
        resp.raise_for_status()
        data = resp.json()

        # The API returns a list of destination matches
        if isinstance(data, dict) and data.get("data"):
            results = data["data"]
        elif isinstance(data, list) and len(data) > 0:
            results = data
        else:
            return None

        if len(results) > 0:
            first = results[0]
            return {
                "dest_id": first.get("dest_id"),
                "search_type": first.get("search_type", "city"),
                "name": first.get("name", query),
            }
        return None
    except Exception as e:
        logger.warning(f"Destination search failed: {e}")
        return None


def search_hotels_external(destination, checkin=None, checkout=None, adults=2, rooms=1):
    """
    Search for hotels via RapidAPI Booking.com.
    Returns a list of normalized hotel dicts, or None on failure.
    """
    if not is_api_configured():
        return None

    # Step 1: Resolve destination to a dest_id
    dest_info = search_destination(destination)
    if not dest_info or not dest_info.get("dest_id"):
        return None

    # Step 2: Search hotels
    try:
        params = {
            "dest_id": dest_info["dest_id"],
            "search_type": dest_info.get("search_type", "CITY"),
            "adults": adults,
            "room_qty": rooms,
            "page_number": 1,
            "units": "metric",
            "temperature_unit": "c",
            "languagecode": "en-us",
            "currency_code": "INR",
        }

        if checkin:
            params["arrival_date"] = checkin
        if checkout:
            params["departure_date"] = checkout

        resp = requests.get(
            f"{BASE_URL}/api/v1/hotels/searchHotels",
            headers=HEADERS,
            params=params,
            timeout=15,
        )
        resp.raise_for_status()
        data = resp.json()

        # Extract hotel results from response
        raw_hotels = []
        if isinstance(data, dict):
            if data.get("data") and isinstance(data["data"], dict):
                raw_hotels = data["data"].get("hotels", [])
            elif data.get("data") and isinstance(data["data"], list):
                raw_hotels = data["data"]
            elif data.get("result"):
                raw_hotels = data["result"]

        # Normalize to our format
        hotels = []
        for h in raw_hotels[:12]:  # Limit to 12 results
            hotel = normalize_hotel(h)
            if hotel:
                hotels.append(hotel)

        return hotels if hotels else None

    except Exception as e:
        logger.warning(f"Hotel search failed: {e}")
        return None


def normalize_hotel(raw):
    """Convert RapidAPI Booking.com hotel to our standard format."""
    try:
        # Extract price — different response formats
        price_value = 0
        if isinstance(raw.get("property"), dict):
            prop = raw["property"]
            price_info = prop.get("priceBreakdown", {})
            if price_info.get("grossPrice"):
                price_value = price_info["grossPrice"].get("value", 0)
            name = prop.get("name", "")
            review_score = prop.get("reviewScore", 0)
            photo_url = prop.get("photoUrls", [""])[0] if prop.get("photoUrls") else ""
            hotel_id = prop.get("id", "")
            lat = prop.get("latitude", 0)
            lon = prop.get("longitude", 0)
        else:
            name = raw.get("hotel_name", raw.get("name", ""))
            review_score = raw.get("review_score", raw.get("rating", 0))
            photo_url = raw.get("main_photo_url", raw.get("photo", raw.get("image_url", "")))
            hotel_id = raw.get("hotel_id", raw.get("id", ""))
            price_value = raw.get("min_total_price", raw.get("price", 0))
            lat = raw.get("latitude", 0)
            lon = raw.get("longitude", 0)

        if not name:
            return None

        # Ensure HTTPS for images
        if photo_url and photo_url.startswith("http:"):
            photo_url = photo_url.replace("http:", "https:")

        star_rating = round(float(review_score or 0) / 2, 1) if float(review_score or 0) > 5 else float(review_score or 0)

        return {
            "id": str(hotel_id),
            "external_hotel_id": str(hotel_id),
            "name": name,
            "location": raw.get("city", raw.get("address", raw.get("property", {}).get("wishlistName", ""))),
            "star_rating": star_rating,
            "review_score": float(review_score or 0),
            "price_range": {
                "min": int(price_value) if price_value else 0,
                "max": int(price_value * 1.5) if price_value else 0,
            },
            "price_per_night": int(price_value) if price_value else 0,
            "image_url": photo_url,
            "amenities": [],  # Not available in search results
            "latitude": lat,
            "longitude": lon,
            "source": "booking.com",
        }
    except Exception as e:
        logger.warning(f"Failed to normalize hotel: {e}")
        return None
