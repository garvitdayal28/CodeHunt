"""Transport suggestion service without paid provider dependencies."""

import json
import logging
from urllib.parse import quote_plus

from app.services.ai_model import invoke_bedrock_stream, is_ai_configured
from app.services.planner_schemas import normalize_transport_option

logger = logging.getLogger(__name__)


def _safe_json(value, fallback=None):
    try:
        return json.loads(value)
    except Exception:
        return fallback


def _extract_json(text):
    if not text:
        return None
    raw = str(text).strip()
    direct = _safe_json(raw)
    if isinstance(direct, dict):
        return direct
    start = raw.find("{")
    end = raw.rfind("}")
    if start == -1 or end == -1 or end <= start:
        return None
    return _safe_json(raw[start : end + 1])


def _default_booking_url(mode, origin, destination, date):
    query = quote_plus(f"{origin} to {destination} {date}".strip())
    if mode == "FLIGHT":
        return f"https://www.google.com/travel/flights?q={query}"
    return f"https://www.google.com/search?q={query}+train+booking"


def _normalize_rows(rows, mode, criteria):
    origin = criteria.get("origin") or criteria.get("origin_city") or ""
    destination = criteria.get("destination") or criteria.get("destination_city") or ""
    date = criteria.get("date") or ""

    normalized = []
    for row in (rows or [])[:5]:
        normalized.append(
            normalize_transport_option(
                {
                    "mode": mode,
                    "provider": row.get("provider") or ("AI Estimated Airfare" if mode == "FLIGHT" else "AI Estimated Railfare"),
                    "departure": row.get("departure") or origin,
                    "arrival": row.get("arrival") or destination,
                    "duration": row.get("duration") or "",
                    "price": row.get("price") or 0,
                    "currency": row.get("currency") or "INR",
                    "booking_url": row.get("booking_url") or _default_booking_url(mode, origin, destination, date),
                    "notes": row.get("notes") or "AI-generated estimate. Verify timings and fares before booking.",
                    "is_live": False,
                }
            )
        )
    return normalized


def _heuristic_options(criteria, mode):
    origin = criteria.get("origin") or criteria.get("origin_city") or "Origin"
    destination = criteria.get("destination") or criteria.get("destination_city") or "Destination"
    date = criteria.get("date") or ""
    travelers = int(criteria.get("travelers") or 1)

    if mode == "FLIGHT":
        base = max(2500, 3200 + (travelers * 350))
        durations = ["1h 45m", "2h 10m", "2h 30m"]
        providers = ["IndiGo (est.)", "Air India (est.)", "Akasa Air (est.)"]
    else:
        base = max(350, 480 + (travelers * 80))
        durations = ["8h 20m", "9h 10m", "10h 00m"]
        providers = ["Vande Bharat (est.)", "Rajdhani (est.)", "Superfast Express (est.)"]

    rows = []
    for idx in range(3):
        rows.append(
            {
                "provider": providers[idx],
                "departure": origin,
                "arrival": destination,
                "duration": durations[idx],
                "price": base + (idx * (600 if mode == "FLIGHT" else 180)),
                "currency": "INR",
                "booking_url": _default_booking_url(mode, origin, destination, date),
                "notes": "Estimated option generated locally (no live provider lookup).",
            }
        )
    return _normalize_rows(rows, mode, criteria)


def _model_options(criteria, modes):
    origin = criteria.get("origin") or criteria.get("origin_city") or ""
    destination = criteria.get("destination") or criteria.get("destination_city") or ""
    date = criteria.get("date") or ""
    travelers = int(criteria.get("travelers") or 1)
    mode_list = sorted(modes)

    prompt = f"""
Generate India travel transport fare estimates as JSON only.
Origin: {origin}
Destination: {destination}
Date: {date}
Travelers: {travelers}
Modes: {", ".join(mode_list)}

Return exactly this object shape:
{{
  "flights": [{{"provider":"", "departure":"", "arrival":"", "duration":"", "price":0, "currency":"INR", "booking_url":"", "notes":""}}],
  "trains": [{{"provider":"", "departure":"", "arrival":"", "duration":"", "price":0, "currency":"INR", "booking_url":"", "notes":""}}]
}}

Rules:
- Return up to 3 options per requested mode.
- These are estimates, not live prices.
- Use INR.
- Do not include markdown or any extra text.
""".strip()

    chunks = []
    text = invoke_bedrock_stream(prompt, on_token=lambda c: chunks.append(c), temperature=0.3, max_tokens=1200)
    parsed = _extract_json(text or "".join(chunks))
    if not isinstance(parsed, dict):
        return {"flights": [], "trains": []}

    flights = _normalize_rows(parsed.get("flights") or [], "FLIGHT", criteria) if "FLIGHT" in modes else []
    trains = _normalize_rows(parsed.get("trains") or [], "TRAIN", criteria) if "TRAIN" in modes else []
    return {"flights": flights, "trains": trains}


def generate_transport_suggestions(criteria, modes):
    """
    Return transport suggestions without third-party paid APIs.
    Output: ({'flights': [...], 'trains': [...]}, warnings)
    """
    requested = {str(mode or "").upper() for mode in (modes or [])}
    if not requested:
        requested = {"FLIGHT", "TRAIN"}

    warnings = []
    options = {"flights": [], "trains": []}
    if is_ai_configured():
        try:
            options = _model_options(criteria, requested)
        except Exception as exc:
            logger.warning("AI transport suggestion failed: %s", exc)
            warnings.append("AI transport estimate failed; using default indicative suggestions.")
    else:
        warnings.append("AI not configured for transport estimate; using default indicative suggestions.")

    if "FLIGHT" in requested and not options.get("flights"):
        options["flights"] = _heuristic_options(criteria, "FLIGHT")
    if "TRAIN" in requested and not options.get("trains"):
        options["trains"] = _heuristic_options(criteria, "TRAIN")
    return options, warnings


def search_flights(criteria):
    options, _ = generate_transport_suggestions(criteria, {"FLIGHT"})
    return options.get("flights") or []


def search_trains(criteria):
    options, _ = generate_transport_suggestions(criteria, {"TRAIN"})
    return options.get("trains") or []
