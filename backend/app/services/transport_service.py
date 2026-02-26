"""Flight and train search adapters with normalized transport output."""

import logging
import os

import requests

from app.services.planner_schemas import normalize_transport_option

logger = logging.getLogger(__name__)

DEFAULT_TIMEOUT = 12


def _rapidapi_key():
    return os.getenv("RAPIDAPI_KEY", "").strip()


def _enabled():
    return bool(_rapidapi_key())


def _request(host, path, params):
    url = f"https://{host}{path}"
    headers = {
        "x-rapidapi-key": _rapidapi_key(),
        "x-rapidapi-host": host,
    }
    response = requests.get(url, headers=headers, params=params, timeout=DEFAULT_TIMEOUT)
    response.raise_for_status()
    return response.json()


def _safe_get(data, keys, default=None):
    current = data
    for key in keys:
        if not isinstance(current, dict):
            return default
        current = current.get(key)
    return current if current is not None else default


def _as_list(value):
    if isinstance(value, list):
        return value
    if isinstance(value, dict):
        for key in ("data", "results", "itineraries", "trips", "journeys"):
            maybe = value.get(key)
            if isinstance(maybe, list):
                return maybe
    return []


def _normalize_flight_rows(rows):
    results = []
    for row in rows[:8]:
        dep = _safe_get(row, ["departure"]) or _safe_get(row, ["origin"]) or _safe_get(row, ["from"])
        arr = _safe_get(row, ["arrival"]) or _safe_get(row, ["destination"]) or _safe_get(row, ["to"])
        carrier = _safe_get(row, ["carrier"]) or _safe_get(row, ["airline"]) or "RapidAPI"
        duration = _safe_get(row, ["duration"]) or _safe_get(row, ["durationText"]) or ""
        amount = _safe_get(row, ["price", "amount"]) or _safe_get(row, ["price"]) or _safe_get(row, ["amount"]) or 0
        currency = _safe_get(row, ["price", "currency"]) or _safe_get(row, ["currency"]) or "INR"
        booking_url = _safe_get(row, ["booking_url"]) or _safe_get(row, ["deeplink"]) or _safe_get(row, ["url"]) or ""
        results.append(
            normalize_transport_option(
                {
                    "mode": "FLIGHT",
                    "provider": str(carrier),
                    "departure": str(dep or ""),
                    "arrival": str(arr or ""),
                    "duration": str(duration or ""),
                    "price": amount,
                    "currency": str(currency),
                    "booking_url": str(booking_url or ""),
                    "notes": "Live provider result",
                    "is_live": True,
                }
            )
        )
    return results


def _normalize_train_rows(rows):
    results = []
    for row in rows[:8]:
        dep = _safe_get(row, ["from"]) or _safe_get(row, ["departure"]) or _safe_get(row, ["source"])
        arr = _safe_get(row, ["to"]) or _safe_get(row, ["arrival"]) or _safe_get(row, ["destination"])
        provider = _safe_get(row, ["provider"]) or _safe_get(row, ["name"]) or "RapidAPI"
        duration = _safe_get(row, ["duration"]) or _safe_get(row, ["travel_time"]) or ""
        amount = _safe_get(row, ["fare"]) or _safe_get(row, ["price"]) or 0
        booking_url = _safe_get(row, ["booking_url"]) or _safe_get(row, ["deeplink"]) or _safe_get(row, ["url"]) or ""
        results.append(
            normalize_transport_option(
                {
                    "mode": "TRAIN",
                    "provider": str(provider),
                    "departure": str(dep or ""),
                    "arrival": str(arr or ""),
                    "duration": str(duration or ""),
                    "price": amount,
                    "currency": "INR",
                    "booking_url": str(booking_url or ""),
                    "notes": "Live provider result",
                    "is_live": True,
                }
            )
        )
    return results


def search_flights(criteria):
    """
    Search flights from RapidAPI. Returns normalized options list.
    criteria: {origin, destination, date, travelers}
    """
    if not _enabled():
        return []

    host = os.getenv("RAPIDAPI_FLIGHT_HOST", "sky-scrapper.p.rapidapi.com")
    params = {
        "fromEntityId": criteria.get("origin") or criteria.get("origin_city") or "",
        "toEntityId": criteria.get("destination") or criteria.get("destination_city") or "",
        "departDate": criteria.get("date") or "",
        "adults": criteria.get("travelers") or 1,
        "currency": "INR",
        "market": "IN",
        "locale": "en-IN",
    }

    candidate_paths = [
        "/api/v1/flights/searchFlights",
        "/api/v2/flights/searchFlights",
        "/api/v1/flights/search",
    ]

    for path in candidate_paths:
        try:
            payload = _request(host, path, params)
            rows = _as_list(payload)
            options = _normalize_flight_rows(rows)
            if options:
                return options
        except Exception as exc:
            logger.info("Flight adapter path failed (%s%s): %s", host, path, exc)
    return []


def search_trains(criteria):
    """
    Search trains from RapidAPI. Returns normalized options list.
    criteria: {origin, destination, date}
    """
    if not _enabled():
        return []

    host = os.getenv("RAPIDAPI_TRAIN_HOST", "irctc1.p.rapidapi.com")
    params = {
        "fromStationCode": criteria.get("origin") or criteria.get("origin_city") or "",
        "toStationCode": criteria.get("destination") or criteria.get("destination_city") or "",
        "dateOfJourney": criteria.get("date") or "",
    }

    candidate_paths = [
        "/api/v1/searchTrain",
        "/api/v2/searchTrain",
        "/api/v1/trainBetweenStations",
    ]

    for path in candidate_paths:
        try:
            payload = _request(host, path, params)
            rows = _as_list(payload)
            options = _normalize_train_rows(rows)
            if options:
                return options
        except Exception as exc:
            logger.info("Train adapter path failed (%s%s): %s", host, path, exc)
    return []
