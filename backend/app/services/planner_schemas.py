"""Validation and normalization schemas for realtime planner sessions."""

from datetime import datetime


DATE_FMT = "%Y-%m-%d"
ALLOWED_BUDGETS = {"BUDGET", "MID_RANGE", "LUXURY"}
ALLOWED_TRANSPORT = {"FLIGHT", "TRAIN"}


def _normalize_string(value):
    if value is None:
        return ""
    return str(value).strip()


def _normalize_string_list(value):
    if value is None:
        return []
    if isinstance(value, list):
        return [str(item).strip() for item in value if str(item).strip()]
    if isinstance(value, str):
        return [item.strip() for item in value.split(",") if item.strip()]
    return []


def _parse_date(value):
    if not value:
        return None
    try:
        return datetime.strptime(str(value), DATE_FMT).date()
    except (TypeError, ValueError):
        return None


def validate_create_session_payload(payload):
    """Return (normalized_payload, error_message)."""
    if not isinstance(payload, dict):
        return None, "Request body must be a JSON object."

    origin = _normalize_string(payload.get("origin"))
    destination = _normalize_string(payload.get("destination"))
    if not destination:
        return None, "destination is required."
    if not origin:
        origin = "India"

    start_date = _normalize_string(payload.get("start_date"))
    end_date = _normalize_string(payload.get("end_date"))
    start = _parse_date(start_date)
    end = _parse_date(end_date)
    if start_date and not start:
        return None, "start_date must be in YYYY-MM-DD format."
    if end_date and not end:
        return None, "end_date must be in YYYY-MM-DD format."
    if start and end and end < start:
        return None, "end_date must be on or after start_date."

    travelers_raw = payload.get("travelers", 1)
    try:
        travelers = int(travelers_raw)
    except (TypeError, ValueError):
        return None, "travelers must be an integer."
    if travelers < 1 or travelers > 20:
        return None, "travelers must be between 1 and 20."

    budget = _normalize_string(payload.get("budget")).upper().replace("-", "_")
    if not budget:
        budget = "MID_RANGE"
    if budget not in ALLOWED_BUDGETS:
        return None, f"budget must be one of: {', '.join(sorted(ALLOWED_BUDGETS))}."

    interests = _normalize_string_list(payload.get("interests"))
    transport_modes = [mode.upper() for mode in _normalize_string_list(payload.get("transport_modes"))]
    if not transport_modes:
        transport_modes = ["FLIGHT", "TRAIN"]
    for mode in transport_modes:
        if mode not in ALLOWED_TRANSPORT:
            return None, f"transport_modes may contain only: {', '.join(sorted(ALLOWED_TRANSPORT))}."

    trip_days_raw = payload.get("trip_days")
    if trip_days_raw is None and start and end:
        trip_days = max((end - start).days + 1, 1)
    else:
        try:
            trip_days = int(trip_days_raw or 3)
        except (TypeError, ValueError):
            return None, "trip_days must be an integer."
    if trip_days < 1 or trip_days > 30:
        return None, "trip_days must be between 1 and 30."

    normalized = {
        "origin": origin,
        "destination": destination,
        "start_date": start_date or None,
        "end_date": end_date or None,
        "trip_days": trip_days,
        "travelers": travelers,
        "budget": budget,
        "interests": interests,
        "transport_modes": transport_modes,
        "notes": _normalize_string(payload.get("notes")),
    }
    return normalized, None


def normalize_transport_option(option):
    """Normalize one transport option for planner payload contracts."""
    data = option or {}
    try:
        price = float(data.get("price", 0) or 0)
    except (TypeError, ValueError):
        price = 0.0

    return {
        "mode": _normalize_string(data.get("mode")).upper() or "UNKNOWN",
        "provider": _normalize_string(data.get("provider")) or "unknown",
        "departure": _normalize_string(data.get("departure")),
        "arrival": _normalize_string(data.get("arrival")),
        "duration": _normalize_string(data.get("duration")),
        "price": round(price, 2),
        "currency": _normalize_string(data.get("currency")).upper() or "INR",
        "booking_url": _normalize_string(data.get("booking_url")),
        "notes": _normalize_string(data.get("notes")),
        "is_live": bool(data.get("is_live", False)),
    }
