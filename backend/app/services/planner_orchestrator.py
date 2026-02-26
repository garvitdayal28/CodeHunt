"""Realtime planner session orchestration (RAG + transport + Bedrock stream)."""

import json
import logging
import threading
import time
from datetime import datetime, timedelta
from urllib.parse import quote_plus

from app.services.ai_model import invoke_bedrock_stream, is_ai_configured
from app.services.firebase_service import get_firestore_client
from app.services.planner_errors import (
    AI_NOT_CONFIGURED,
    PLANNER_CANCELLED,
    PLANNER_NOT_FOUND,
    PLANNER_STREAM_FAILED,
    RAG_UNAVAILABLE,
    TRANSPORT_PROVIDER_UNAVAILABLE,
)
from app.services.planner_schemas import normalize_transport_option
from app.services.rag_indexer_service import retrieve, retrieval_stats
from app.services.transport_service import search_flights, search_trains

logger = logging.getLogger(__name__)

_cancelled_sessions = set()
_cancel_lock = threading.Lock()


def _now_iso():
    return datetime.utcnow().isoformat()


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


def _emit_socket(session_id, event_name, payload):
    from app.services.socket_service import emit_planner_event

    emit_planner_event(session_id, event_name, payload)


def _append_event(session_id, payload):
    db = get_firestore_client()
    doc = dict(payload or {})
    doc["created_at"] = _now_iso()
    db.collection("planner_sessions").document(session_id).collection("events").add(doc)


def _set_status(session_id, status, extra=None):
    db = get_firestore_client()
    update_payload = {
        "status": status,
        "updated_at": _now_iso(),
    }
    if extra:
        update_payload.update(extra)
    db.collection("planner_sessions").document(session_id).set(update_payload, merge=True)


def _progress(session_id, stage, status, message, started_at, extra=None):
    now = time.time()
    payload = {
        "session_id": session_id,
        "stage": stage,
        "status": status,
        "message": message,
        "elapsed_ms": int((now - started_at) * 1000),
    }
    if extra:
        payload.update(extra)
    _append_event(session_id, {"type": "progress", **payload})
    _emit_socket(session_id, "planner:progress", payload)


def _token(session_id, chunk):
    payload = {"session_id": session_id, "chunk": chunk}
    _append_event(session_id, {"type": "token", "chunk": chunk})
    _emit_socket(session_id, "planner:token", payload)


def _is_cancelled(session_id):
    with _cancel_lock:
        return session_id in _cancelled_sessions


def mark_session_cancelled(session_id):
    with _cancel_lock:
        _cancelled_sessions.add(session_id)


def _clear_cancel(session_id):
    with _cancel_lock:
        if session_id in _cancelled_sessions:
            _cancelled_sessions.remove(session_id)


def _validate_ownership(doc, traveler_uid):
    if not doc.exists:
        return False, PLANNER_NOT_FOUND, "Planner session not found."
    data = doc.to_dict() or {}
    if data.get("traveler_uid") != traveler_uid:
        return False, "FORBIDDEN", "You can access only your own planner sessions."
    return True, None, None


def create_session(traveler_uid, planner_input):
    db = get_firestore_client()
    now_iso = _now_iso()
    payload = {
        "traveler_uid": traveler_uid,
        "status": "QUEUED",
        "input": planner_input,
        "progress_summary": [],
        "stream_text": "",
        "result_json": None,
        "retrieval_stats": None,
        "draft_itinerary_id": None,
        "error": None,
        "created_at": now_iso,
        "updated_at": now_iso,
    }
    ref = db.collection("planner_sessions").document()
    ref.set(payload)
    payload["id"] = ref.id
    return payload


def list_sessions(traveler_uid, limit=20):
    db = get_firestore_client()
    query = db.collection("planner_sessions").where("traveler_uid", "==", traveler_uid)
    sessions = []
    for doc in query.stream():
        data = doc.to_dict() or {}
        data["id"] = doc.id
        sessions.append(data)
    sessions.sort(key=lambda row: row.get("created_at") or "", reverse=True)
    return sessions[:limit]


def get_session(session_id, traveler_uid):
    db = get_firestore_client()
    doc = db.collection("planner_sessions").document(session_id).get()
    valid, code, msg = _validate_ownership(doc, traveler_uid)
    if not valid:
        return None, code, msg
    data = doc.to_dict() or {}
    data["id"] = doc.id

    events = []
    for evt in (
        db.collection("planner_sessions")
        .document(session_id)
        .collection("events")
        .order_by("created_at", direction="ASCENDING")
        .stream()
    ):
        row = evt.to_dict() or {}
        row["id"] = evt.id
        events.append(row)
    data["events"] = events
    return data, None, None


def cancel_session(session_id, traveler_uid):
    db = get_firestore_client()
    doc = db.collection("planner_sessions").document(session_id).get()
    valid, code, msg = _validate_ownership(doc, traveler_uid)
    if not valid:
        return False, code, msg
    data = doc.to_dict() or {}
    status = data.get("status")
    if status in {"COMPLETED", "FAILED", "CANCELLED"}:
        return True, None, None

    mark_session_cancelled(session_id)
    _set_status(session_id, "CANCELLED")
    _append_event(
        session_id,
        {
            "type": "status",
            "status": "CANCELLED",
            "message": "Planner session cancelled by user.",
        },
    )
    _emit_socket(session_id, "planner:cancelled", {"session_id": session_id, "status": "CANCELLED"})
    return True, None, None


def _destination_query(input_payload):
    destination = input_payload.get("destination", "")
    notes = input_payload.get("notes", "")
    interests = ", ".join(input_payload.get("interests") or [])
    return " | ".join([part for part in [destination, interests, notes] if part])


def _build_rag_context(matches):
    grouped = {
        "HOTEL": [],
        "RESTAURANT": [],
        "TOUR": [],
        "GUIDE_SERVICE": [],
    }
    for match in matches:
        item = {
            "id": match.get("entity_id"),
            "title": match.get("title"),
            "score": match.get("score"),
            "summary": (match.get("text") or "")[:500],
        }
        etype = str(match.get("entity_type") or "").upper()
        if etype in grouped:
            grouped[etype].append(item)

    return grouped


def _transport_lookup(input_payload, started_at, session_id):
    options = {"flights": [], "trains": []}
    warnings = []
    date = input_payload.get("start_date")
    criteria = {
        "origin": input_payload.get("origin"),
        "destination": input_payload.get("destination"),
        "date": date,
        "travelers": input_payload.get("travelers"),
    }

    modes = set(input_payload.get("transport_modes") or [])
    if "FLIGHT" in modes:
        _progress(session_id, "transport_lookup", "RUNNING", "Searching live flight options", started_at)
        flights = search_flights(criteria)
        options["flights"] = [normalize_transport_option(item) for item in flights]
        if not options["flights"]:
            warnings.append("No live flight options returned from provider.")

    if "TRAIN" in modes:
        _progress(session_id, "transport_lookup", "RUNNING", "Searching live train options", started_at)
        trains = search_trains(criteria)
        options["trains"] = [normalize_transport_option(item) for item in trains]
        if not options["trains"]:
            warnings.append("No live train options returned from provider.")

    return options, warnings


def _build_planner_prompt(input_payload, rag_context, retrieval_meta, transport):
    destination = input_payload.get("destination")
    trip_days = input_payload.get("trip_days")
    interests = ", ".join(input_payload.get("interests") or []) or "general"
    budget = input_payload.get("budget", "MID_RANGE")
    travelers = input_payload.get("travelers", 1)
    origin = input_payload.get("origin")
    notes = input_payload.get("notes")

    flights = transport.get("flights") or []
    trains = transport.get("trains") or []

    prompt = f"""
You are an expert India-first travel planner. Build a practical itinerary.

User input:
- Origin: {origin}
- Destination: {destination}
- Trip days: {trip_days}
- Travelers: {travelers}
- Budget: {budget}
- Interests: {interests}
- Notes: {notes}

Retrieval confidence:
- confidence: {retrieval_meta.get("confidence")}
- top_score: {retrieval_meta.get("top_score")}
- matches: {retrieval_meta.get("count")}

RAG business context (trusted local data):
{json.dumps(rag_context, ensure_ascii=True)}

Live transport data:
- flights: {json.dumps(flights, ensure_ascii=True)}
- trains: {json.dumps(trains, ensure_ascii=True)}

Return ONLY valid JSON object with this shape:
{{
  "destination": "...",
  "trip_days": {trip_days},
  "overview": "...",
  "rag_confidence": "{retrieval_meta.get('confidence')}",
  "daily_plan": [
    {{
      "day": 1,
      "title": "...",
      "activities": [
        {{
          "time": "09:00",
          "name": "...",
          "type": "attraction|restaurant|transport|experience",
          "description": "...",
          "source": "RAG|MODEL"
        }}
      ]
    }}
  ],
  "recommended_hotels": [{{"id":"...", "name":"...", "why":"..."}}],
  "recommended_restaurants": [{{"id":"...", "name":"...", "why":"..."}}],
  "recommended_tours": [{{"id":"...", "name":"...", "why":"..."}}],
  "recommended_guides": [{{"id":"...", "name":"...", "why":"..."}}],
  "transport": {{
    "flight_options": [],
    "train_options": [],
    "live_data_used": true
  }},
  "tips": ["...", "..."]
}}

Rules:
- Prefer RAG recommendations when relevant.
- If live transport is empty, include indicative non-live suggestions and mark them clearly.
- Do not output markdown.
"""
    return prompt.strip()


def _build_booking_actions(input_payload, rag_matches, transport):
    destination = quote_plus(input_payload.get("destination", ""))
    actions = [
        {"type": "HOTELS", "label": "Browse Hotels", "url": f"/traveler/hotels?destination={destination}"},
        {"type": "TOURS", "label": "Browse Tours", "url": f"/traveler/search/tours?destination={destination}"},
        {"type": "RESTAURANTS", "label": "Browse Restaurants", "url": f"/traveler/restaurants?destination={destination}"},
        {"type": "CABS", "label": "Book Local Cab", "url": "/traveler/cabs"},
    ]
    for option in (transport.get("flights") or [])[:2]:
        if option.get("booking_url"):
            actions.append({"type": "FLIGHT", "label": "Open Flight Offer", "url": option.get("booking_url")})
    for option in (transport.get("trains") or [])[:2]:
        if option.get("booking_url"):
            actions.append({"type": "TRAIN", "label": "Open Train Offer", "url": option.get("booking_url")})
    return actions


def _create_draft_itinerary(traveler_uid, planner_input):
    db = get_firestore_client()
    start_date = planner_input.get("start_date")
    end_date = planner_input.get("end_date")
    if not start_date:
        start_date = datetime.utcnow().strftime("%Y-%m-%d")
    if not end_date:
        end = datetime.utcnow() + timedelta(days=int(planner_input.get("trip_days", 3)))
        end_date = end.strftime("%Y-%m-%d")

    payload = {
        "traveler_uid": traveler_uid,
        "traveler_name": "",
        "destination": planner_input.get("destination"),
        "start_date": start_date,
        "end_date": end_date,
        "status": "DRAFT",
        "origin": "AI_PLANNER",
        "created_at": _now_iso(),
        "updated_at": _now_iso(),
    }
    ref = db.collection("itineraries").document()
    ref.set(payload)
    return ref.id


def run_session(session_id):
    db = get_firestore_client()
    doc_ref = db.collection("planner_sessions").document(session_id)
    doc = doc_ref.get()
    if not doc.exists:
        return
    session = doc.to_dict() or {}
    traveler_uid = session.get("traveler_uid")
    planner_input = session.get("input") or {}
    started_at = time.time()
    stream_buffer = []
    progress_messages = []

    try:
        if _is_cancelled(session_id):
            raise RuntimeError(PLANNER_CANCELLED)

        _set_status(session_id, "RUNNING")
        _progress(session_id, "validate_input", "DONE", "Input validated and planning started", started_at)
        progress_messages.append("Input validated")

        if not is_ai_configured():
            raise RuntimeError(AI_NOT_CONFIGURED)

        if _is_cancelled(session_id):
            raise RuntimeError(PLANNER_CANCELLED)

        _progress(session_id, "rag_retrieve", "RUNNING", "Retrieving relevant business data", started_at)
        query_text = _destination_query(planner_input)
        rag_matches = retrieve(query_text)
        rag_meta = retrieval_stats(rag_matches)
        rag_context = _build_rag_context(rag_matches)
        _progress(
            session_id,
            "rag_retrieve",
            "DONE",
            f"Retrieved {rag_meta.get('count')} candidates (confidence: {rag_meta.get('confidence')})",
            started_at,
            {"retrieval_stats": rag_meta},
        )
        progress_messages.append(f"RAG retrieval complete ({rag_meta.get('confidence')} confidence)")

        if _is_cancelled(session_id):
            raise RuntimeError(PLANNER_CANCELLED)

        _progress(session_id, "transport_lookup", "RUNNING", "Fetching train/flight options", started_at)
        transport, transport_warnings = _transport_lookup(planner_input, started_at, session_id)
        live_count = len(transport.get("flights") or []) + len(transport.get("trains") or [])
        _progress(
            session_id,
            "transport_lookup",
            "DONE",
            f"Transport lookup completed with {live_count} live options",
            started_at,
            {"warnings": transport_warnings},
        )
        if transport_warnings:
            progress_messages.extend(transport_warnings)

        if _is_cancelled(session_id):
            raise RuntimeError(PLANNER_CANCELLED)

        _progress(session_id, "plan_synthesis_stream", "RUNNING", "Generating itinerary with streamed output", started_at)
        prompt = _build_planner_prompt(planner_input, rag_context, rag_meta, transport)

        def on_chunk(chunk):
            if _is_cancelled(session_id):
                return
            stream_buffer.append(chunk)
            _token(session_id, chunk)

        text = invoke_bedrock_stream(prompt, on_chunk=on_chunk, temperature=0.6, max_tokens=8192)
        parsed = _extract_json(text)
        if not isinstance(parsed, dict):
            parsed = {
                "destination": planner_input.get("destination"),
                "trip_days": planner_input.get("trip_days"),
                "overview": text[:1200],
                "daily_plan": [],
                "recommended_hotels": [],
                "recommended_restaurants": [],
                "recommended_tours": [],
                "recommended_guides": [],
                "transport": {"flight_options": [], "train_options": [], "live_data_used": False},
                "tips": [],
                "rag_confidence": rag_meta.get("confidence"),
            }

        parsed_transport = parsed.get("transport") or {}
        parsed_transport["flight_options"] = transport.get("flights") or parsed_transport.get("flight_options") or []
        parsed_transport["train_options"] = transport.get("trains") or parsed_transport.get("train_options") or []
        parsed_transport["live_data_used"] = bool(parsed_transport["flight_options"] or parsed_transport["train_options"])
        parsed["transport"] = parsed_transport

        booking_actions = _build_booking_actions(planner_input, rag_matches, transport)
        parsed["booking_actions"] = booking_actions
        parsed["retrieval_stats"] = rag_meta

        _progress(session_id, "plan_synthesis_stream", "DONE", "Model generation completed", started_at)

        if _is_cancelled(session_id):
            raise RuntimeError(PLANNER_CANCELLED)

        _progress(session_id, "persist_results", "RUNNING", "Saving planner result and draft itinerary", started_at)
        draft_itinerary_id = _create_draft_itinerary(traveler_uid, planner_input)
        parsed["draft_itinerary_id"] = draft_itinerary_id
        parsed["saved_at"] = _now_iso()
        _set_status(
            session_id,
            "COMPLETED",
            extra={
                "stream_text": "".join(stream_buffer),
                "result_json": parsed,
                "retrieval_stats": rag_meta,
                "progress_summary": progress_messages,
                "draft_itinerary_id": draft_itinerary_id,
                "error": None,
            },
        )
        _progress(session_id, "persist_results", "DONE", "Planner result saved successfully", started_at)

        completion_payload = {
            "session_id": session_id,
            "status": "COMPLETED",
            "result": parsed,
            "draft_itinerary_id": draft_itinerary_id,
        }
        _append_event(session_id, {"type": "complete", **completion_payload})
        _emit_socket(session_id, "planner:complete", completion_payload)
    except Exception as exc:
        error_text = str(exc)
        status = "FAILED"
        error_code = PLANNER_STREAM_FAILED
        if error_text == PLANNER_CANCELLED:
            status = "CANCELLED"
            error_code = PLANNER_CANCELLED
        elif error_text == AI_NOT_CONFIGURED:
            error_code = AI_NOT_CONFIGURED
        elif error_text == RAG_UNAVAILABLE:
            error_code = RAG_UNAVAILABLE
        elif error_text == TRANSPORT_PROVIDER_UNAVAILABLE:
            error_code = TRANSPORT_PROVIDER_UNAVAILABLE

        _set_status(
            session_id,
            status,
            extra={
                "error": {"code": error_code, "message": error_text},
                "stream_text": "".join(stream_buffer),
            },
        )
        payload = {
            "session_id": session_id,
            "status": status,
            "error": {"code": error_code, "message": error_text},
        }
        _append_event(session_id, {"type": "error", **payload})
        _emit_socket(session_id, "planner:error", payload)
    finally:
        _clear_cancel(session_id)
