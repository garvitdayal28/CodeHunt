"""
Geocoding helpers using OpenStreetMap Nominatim + Photon autocomplete.
"""

from urllib.parse import quote_plus

import requests

NOMINATIM_BASE_URL = "https://nominatim.openstreetmap.org"
PHOTON_BASE_URL = "https://photon.komoot.io/api"
DEFAULT_HEADERS = {
    "User-Agent": "TripAllied/1.0 (support@tripallied.local)",
}


def _extract_city(address_dict):
    if not isinstance(address_dict, dict):
        return None
    return (
        address_dict.get("city")
        or address_dict.get("town")
        or address_dict.get("village")
        or address_dict.get("state_district")
        or address_dict.get("county")
    )


def _search_nominatim(query_text):
    query = quote_plus(str(query_text).strip())
    url = (
        f"{NOMINATIM_BASE_URL}/search?q={query}"
        "&format=jsonv2&addressdetails=1&limit=1&countrycodes=in"
    )
    res = requests.get(url, headers=DEFAULT_HEADERS, timeout=8)
    res.raise_for_status()
    payload = res.json()
    if not payload:
        return None
    return payload[0]


def _format_photon_feature(feature):
    properties = feature.get("properties", {}) if isinstance(feature, dict) else {}
    geometry = feature.get("geometry", {}) if isinstance(feature, dict) else {}
    coords = geometry.get("coordinates") if isinstance(geometry, dict) else None
    if not properties or not isinstance(coords, list) or len(coords) < 2:
        return None

    name = (properties.get("name") or "").strip()
    street = (properties.get("street") or "").strip()
    housenumber = (properties.get("housenumber") or "").strip()
    suburb = (properties.get("suburb") or "").strip()
    city = (
        properties.get("city")
        or properties.get("district")
        or properties.get("county")
        or properties.get("state")
    )
    state = (properties.get("state") or "").strip()
    country = (properties.get("country") or "").strip()

    parts = []
    primary = " ".join(part for part in [housenumber, street] if part).strip()
    if primary:
        parts.append(primary)
    elif name:
        parts.append(name)
    if suburb:
        parts.append(suburb)
    if city:
        parts.append(str(city).strip())
    if state:
        parts.append(state)
    if country:
        parts.append(country)

    display = ", ".join([p for p in parts if p]) or name
    if not display:
        return None

    return {
        "address": display,
        "lat": float(coords[1]),
        "lng": float(coords[0]),
        "city": city,
    }


def forward_geocode(address, city_hint=None):
    """Resolve a free-text address to point + city data."""
    if not address or not str(address).strip():
        return None

    address_text = str(address).strip()
    hint_text = str(city_hint).strip() if city_hint else ""
    candidate_queries = [address_text]
    if hint_text:
        candidate_queries.append(f"{address_text}, {hint_text}")
        candidate_queries.append(f"{address_text}, {hint_text}, India")
    candidate_queries.append(f"{address_text}, India")

    try:
        for candidate in candidate_queries:
            first = _search_nominatim(candidate)
            if not first:
                continue
            city = _extract_city(first.get("address", {}))
            return {
                "address": first.get("display_name") or address_text,
                "lat": float(first["lat"]),
                "lng": float(first["lon"]),
                "city": city,
            }
        return None
    except Exception:
        return None


def reverse_geocode(lat, lng):
    """Resolve coordinates to address + city data."""
    try:
        lat_val = float(lat)
        lng_val = float(lng)
    except (TypeError, ValueError):
        return None

    url = (
        f"{NOMINATIM_BASE_URL}/reverse?lat={lat_val}&lon={lng_val}"
        "&format=jsonv2&addressdetails=1"
    )

    try:
        res = requests.get(url, headers=DEFAULT_HEADERS, timeout=8)
        res.raise_for_status()
        payload = res.json()
        city = _extract_city(payload.get("address", {}))
        return {
            "address": payload.get("display_name"),
            "lat": lat_val,
            "lng": lng_val,
            "city": city,
        }
    except Exception:
        return None


def suggest_addresses(query, city_hint=None, limit=5):
    """Return a small list of matching address suggestions for typeahead UX."""
    if not query or not str(query).strip():
        return []

    q = str(query).strip()
    hint_text = str(city_hint).strip() if city_hint else ""
    try:
        max_limit = max(1, min(int(limit), 10))
    except (TypeError, ValueError):
        max_limit = 5

    candidate_queries = [q]
    if hint_text:
        candidate_queries.append(f"{q}, {hint_text}")
        candidate_queries.append(f"{q}, {hint_text}, India")
    candidate_queries.append(f"{q}, India")

    seen = set()
    results = []
    try:
        # First pass: Photon autocomplete (better for typed suggestions, free).
        for candidate in candidate_queries:
            query_text = quote_plus(candidate)
            photon_url = f"{PHOTON_BASE_URL}/?q={query_text}&limit={max_limit}&lang=en"
            res = requests.get(photon_url, headers=DEFAULT_HEADERS, timeout=8)
            res.raise_for_status()
            features = (res.json() or {}).get("features", [])
            for feature in features:
                item = _format_photon_feature(feature)
                if not item:
                    continue
                display = item["address"]
                if display in seen:
                    continue
                seen.add(display)
                results.append(item)
                if len(results) >= max_limit:
                    return results

        # Fallback pass: Nominatim search results.
        for candidate in candidate_queries:
            query_text = quote_plus(candidate)
            url = (
                f"{NOMINATIM_BASE_URL}/search?q={query_text}"
                f"&format=jsonv2&addressdetails=1&limit={max_limit}&countrycodes=in"
            )
            res = requests.get(url, headers=DEFAULT_HEADERS, timeout=8)
            res.raise_for_status()
            payload = res.json() or []

            for item in payload:
                display = (item.get("display_name") or "").strip()
                if not display or display in seen:
                    continue
                seen.add(display)
                results.append(
                    {
                        "address": display,
                        "lat": float(item["lat"]),
                        "lng": float(item["lon"]),
                        "city": _extract_city(item.get("address", {})),
                    }
                )
                if len(results) >= max_limit:
                    return results
        return results
    except Exception:
        return []
