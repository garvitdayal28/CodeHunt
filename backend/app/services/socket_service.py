"""
Socket.IO service for realtime cab rides.
"""

import threading
import random

from firebase_admin import firestore
from flask import request
from flask_socketio import SocketIO, emit, join_room, leave_room

from app.services.firebase_service import get_firestore_client, verify_firebase_token
from app.services.geocode_service import forward_geocode, reverse_geocode
from app.utils.rides import (
    ACTIVE_RIDE_STATUSES,
    RIDE_STATUS_ACCEPTED_PENDING_QUOTE,
    RIDE_STATUS_CANCELLED,
    RIDE_STATUS_COMPLETED,
    RIDE_STATUS_DRIVER_EN_ROUTE,
    RIDE_STATUS_EXPIRED,
    RIDE_STATUS_IN_PROGRESS,
    RIDE_STATUS_QUOTE_ACCEPTED,
    RIDE_STATUS_QUOTE_SENT,
    RIDE_STATUS_REQUESTED,
    add_ride_event,
    can_transition,
    estimate_eta_minutes,
    get_active_ride_for_driver,
    get_active_ride_for_traveler,
    get_user_doc,
    is_cab_driver_user,
    normalize_city_key,
    serialize_doc,
    utcnow_iso,
)

socketio = SocketIO()
_socket_users = {}
_request_timers = {}
_quote_timers = {}
_init_lock = threading.Lock()
_handlers_registered = False


def get_socketio():
    return socketio


def _city_key(city):
    return normalize_city_key(city)


def _emit_error(message, error="RIDE_ERROR", to_sid=None):
    payload = {"error": error, "message": message}
    socketio.emit("ride:error", payload, to=to_sid, namespace="/rides")


def _emit_to_user(uid, event, payload):
    socketio.emit(event, payload, room=f"user:{uid}", namespace="/rides")


def _sanitize_ride_for_driver(ride):
    if not isinstance(ride, dict):
        return ride
    sanitized = dict(ride)
    sanitized.pop("start_otp", None)
    return sanitized


def _emit_status(ride):
    traveler_payload = {"ride": ride}
    driver_payload = {"ride": _sanitize_ride_for_driver(ride)}
    public_payload = {"ride": _sanitize_ride_for_driver(ride)}
    if ride.get("traveler_uid"):
        _emit_to_user(ride["traveler_uid"], "ride:status_changed", traveler_payload)
    if ride.get("driver_uid"):
        _emit_to_user(ride["driver_uid"], "ride:status_changed", driver_payload)
    socketio.emit("ride:status_changed", public_payload, room=f"ride:{ride['id']}", namespace="/rides")


def _emit_location_and_eta(ride):
    location_payload = {"ride_id": ride["id"], "driver_location": ride.get("driver_location")}
    eta_payload = {"ride_id": ride["id"], "eta_minutes": ride.get("eta_minutes")}
    if ride.get("traveler_uid"):
        _emit_to_user(ride["traveler_uid"], "ride:location_updated", location_payload)
        _emit_to_user(ride["traveler_uid"], "ride:eta_updated", eta_payload)
    if ride.get("driver_uid"):
        _emit_to_user(ride["driver_uid"], "ride:location_updated", location_payload)
        _emit_to_user(ride["driver_uid"], "ride:eta_updated", eta_payload)
    socketio.emit("ride:location_updated", location_payload, room=f"ride:{ride['id']}", namespace="/rides")
    socketio.emit("ride:eta_updated", eta_payload, room=f"ride:{ride['id']}", namespace="/rides")


def _normalize_location(location):
    if not isinstance(location, dict):
        return None
    try:
        lat = float(location.get("lat"))
        lng = float(location.get("lng"))
    except (TypeError, ValueError):
        return None
    normalized = {"lat": lat, "lng": lng}
    if location.get("address"):
        normalized["address"] = str(location.get("address")).strip()
    return normalized


def _cancel_timer(timer_map, ride_id):
    timer = timer_map.pop(ride_id, None)
    if timer:
        timer.cancel()


def _schedule_request_timeout(ride_id, timeout_s=45):
    _cancel_timer(_request_timers, ride_id)

    def _expire():
        db = get_firestore_client()
        ride_ref = db.collection("rides").document(ride_id)
        doc = ride_ref.get()
        if not doc.exists:
            return
        ride = doc.to_dict()
        if ride.get("status") != RIDE_STATUS_REQUESTED:
            return
        ride_ref.update({"status": RIDE_STATUS_EXPIRED, "updated_at": utcnow_iso()})
        updated = ride_ref.get().to_dict()
        updated["id"] = ride_id
        add_ride_event(db, ride_id, "REQUEST_EXPIRED", "system", {})
        _emit_status(updated)

    timer = threading.Timer(timeout_s, _expire)
    timer.daemon = True
    timer.start()
    _request_timers[ride_id] = timer


def _schedule_quote_timeout(ride_id, timeout_s=120):
    _cancel_timer(_quote_timers, ride_id)

    def _expire():
        db = get_firestore_client()
        ride_ref = db.collection("rides").document(ride_id)
        doc = ride_ref.get()
        if not doc.exists:
            return
        ride = doc.to_dict()
        if ride.get("status") != RIDE_STATUS_QUOTE_SENT:
            return
        ride_ref.update({"status": RIDE_STATUS_EXPIRED, "updated_at": utcnow_iso()})
        updated = ride_ref.get().to_dict()
        updated["id"] = ride_id
        add_ride_event(db, ride_id, "QUOTE_EXPIRED", "system", {})
        _emit_status(updated)

    timer = threading.Timer(timeout_s, _expire)
    timer.daemon = True
    timer.start()
    _quote_timers[ride_id] = timer


def _presence_for_online_drivers(city_key_value):
    db = get_firestore_client()
    query = (
        db.collection("driver_presence")
        .where("online", "==", True)
        .where("city_key", "==", city_key_value)
    )
    return [serialize_doc(doc) for doc in query.stream()]


def _emit_online_count(city_key_value, city=None, to_sid=None, to_room=None):
    if not city_key_value:
        payload = {"city": city or "", "city_key": "", "count": 0}
    else:
        count = len(_presence_for_online_drivers(city_key_value))
        payload = {"city": city or "", "city_key": city_key_value, "count": count}
    if to_sid:
        socketio.emit("rides:online_count", payload, to=to_sid, namespace="/rides")
    elif to_room:
        socketio.emit("rides:online_count", payload, room=to_room, namespace="/rides")


def _create_ride_from_request(uid, source, destination):
    db = get_firestore_client()
    user = get_user_doc(uid) or {}
    now_iso = utcnow_iso()
    city = source.get("city")
    ride_payload = {
        "traveler_uid": uid,
        "traveler_name": user.get("display_name") or user.get("email", "").split("@")[0],
        "driver_uid": None,
        "driver_name": None,
        "vehicle_type": None,
        "vehicle_number": None,
        "city": city,
        "city_key": _city_key(city),
        "source": {
            "address": source.get("address"),
            "lat": source.get("lat"),
            "lng": source.get("lng"),
        },
        "destination": {
            "address": destination.get("address"),
            "lat": destination.get("lat"),
            "lng": destination.get("lng"),
        },
        "status": RIDE_STATUS_REQUESTED,
        "quoted_price": None,
        "currency": "INR",
        "quote_note": None,
        "traveler_location": {
            "address": source.get("address"),
            "lat": source.get("lat"),
            "lng": source.get("lng"),
        },
        "driver_location": None,
        "eta_minutes": None,
        "created_at": now_iso,
        "updated_at": now_iso,
        "accepted_at": None,
        "started_at": None,
        "completed_at": None,
        "start_otp": None,
        "start_otp_created_at": None,
        "start_otp_verified_at": None,
        "rating": {},
    }

    ref = db.collection("rides").document()
    ref.set(ride_payload)
    ride_payload["id"] = ref.id
    add_ride_event(db, ref.id, "RIDE_REQUESTED", uid, {"city": city})
    return ride_payload


def _end_ride_internal(ride_id, traveler_uid):
    db = get_firestore_client()
    ride_ref = db.collection("rides").document(ride_id)
    doc = ride_ref.get()
    if not doc.exists:
        return None, "NOT_FOUND", "Ride not found."

    ride = doc.to_dict()
    if ride.get("traveler_uid") != traveler_uid:
        return None, "FORBIDDEN", "Only the ride traveler can end this ride."

    status = ride.get("status")
    if status not in {RIDE_STATUS_IN_PROGRESS, RIDE_STATUS_DRIVER_EN_ROUTE, RIDE_STATUS_QUOTE_ACCEPTED}:
        return None, "INVALID_STATE", "Ride can only be ended while active."

    if not can_transition(status, RIDE_STATUS_COMPLETED):
        return None, "INVALID_STATE", f"Cannot transition from {status} to COMPLETED."

    ride_ref.update(
        {
            "status": RIDE_STATUS_COMPLETED,
            "completed_at": utcnow_iso(),
            "start_otp": None,
            "updated_at": utcnow_iso(),
        }
    )
    _cancel_timer(_quote_timers, ride_id)
    _cancel_timer(_request_timers, ride_id)
    add_ride_event(db, ride_id, "RIDE_COMPLETED", traveler_uid, {})

    updated = ride_ref.get().to_dict()
    updated["id"] = ride_id
    _emit_status(updated)
    _emit_to_user(traveler_uid, "ride:completed", {"ride": updated})
    if updated.get("driver_uid"):
        _emit_to_user(updated["driver_uid"], "ride:completed", {"ride": updated})
    return updated, None, None


def end_ride_by_traveler(ride_id, traveler_uid):
    """Shared ride completion action for both socket and REST calls."""
    return _end_ride_internal(ride_id, traveler_uid)


def init_socketio(app):
    global _handlers_registered

    with _init_lock:
        if not socketio.server:
            socketio.init_app(
                app,
                cors_allowed_origins=[
                    app.config.get("FRONTEND_ORIGIN", "http://localhost:5173"),
                    "http://192.168.29.7:5173"
                ],
                async_mode="threading",
            )

        if _handlers_registered:
            return

        @socketio.on("connect", namespace="/rides")
        def on_connect(auth):
            token = (auth or {}).get("token")
            if not token:
                return False

            decoded = verify_firebase_token(token)
            if decoded is None:
                return False

            uid = decoded.get("uid")
            user_data = get_user_doc(uid)
            if not user_data:
                return False

            business_profile = user_data.get("business_profile") or {}
            business_type = business_profile.get("business_type")
            ctx = {
                "uid": uid,
                "role": decoded.get("role", "TRAVELER"),
                "business_type": business_type,
                "display_name": user_data.get("display_name"),
                "city_key": "",
                "city": "",
            }
            _socket_users[request.sid] = ctx
            join_room(f"user:{uid}")

            db = get_firestore_client()
            ride_query = (
                db.collection("rides").where("traveler_uid", "==", uid)
                if ctx["role"] == "TRAVELER"
                else db.collection("rides").where("driver_uid", "==", uid)
            )
            for doc in ride_query.stream():
                ride_data = doc.to_dict()
                if ride_data.get("status") in ACTIVE_RIDE_STATUSES:
                    join_room(f"ride:{doc.id}")

            if ctx["role"] == "TRAVELER":
                traveler_city = (user_data.get("city") or "").strip()
                traveler_city_key = _city_key(traveler_city)
                if traveler_city_key:
                    ctx["city"] = traveler_city
                    ctx["city_key"] = traveler_city_key
                    join_room(f"city_presence:{traveler_city_key}")
                    _emit_online_count(traveler_city_key, city=traveler_city, to_sid=request.sid)

            emit("rides:connected", {"connected": True, "uid": uid})
            return True

        @socketio.on("disconnect", namespace="/rides")
        def on_disconnect():
            ctx = _socket_users.pop(request.sid, None)
            if not ctx:
                return
            if ctx.get("role") == "BUSINESS" and ctx.get("business_type") == "CAB_DRIVER":
                db = get_firestore_client()
                presence_ref = db.collection("driver_presence").document(ctx["uid"])
                doc = presence_ref.get()
                if doc.exists:
                    current = doc.to_dict()
                    if current.get("socket_id") == request.sid:
                        current_city = current.get("city") or ""
                        current_city_key = _city_key(current_city)
                        presence_ref.set(
                            {
                                "online": False,
                                "socket_id": None,
                                "last_seen_at": utcnow_iso(),
                            },
                            merge=True,
                        )
                        if current_city_key:
                            _emit_online_count(
                                current_city_key,
                                city=current_city,
                                to_room=f"city_presence:{current_city_key}",
                            )
            elif ctx.get("role") == "TRAVELER":
                city_key = ctx.get("city_key")
                if city_key:
                    leave_room(f"city_presence:{city_key}")

        @socketio.on("driver:set_online", namespace="/rides")
        def on_driver_set_online(data):
            ctx = _socket_users.get(request.sid)
            if not ctx or ctx.get("role") != "BUSINESS" or ctx.get("business_type") != "CAB_DRIVER":
                _emit_error("Only CAB_DRIVER business users can set driver online status.", "FORBIDDEN", request.sid)
                return

            data = data or {}
            online = bool(data.get("online", False))
            location = _normalize_location(data.get("location"))
            city = (data.get("city") or "").strip()
            if not city and location:
                reverse = reverse_geocode(location["lat"], location["lng"])
                if reverse:
                    city = reverse.get("city") or city
                    if reverse.get("address") and not location.get("address"):
                        location["address"] = reverse["address"]

            if online and not city:
                _emit_error("City is required to go online as driver.", "INVALID_CITY", request.sid)
                return

            db = get_firestore_client()
            presence_ref = db.collection("driver_presence").document(ctx["uid"])
            prev_doc = presence_ref.get()
            prev_data = prev_doc.to_dict() if prev_doc.exists else {}
            prev_city = prev_data.get("city") or ""
            prev_city_key = _city_key(prev_city)
            payload = {
                "driver_uid": ctx["uid"],
                "online": online,
                "city": city if online else "",
                "city_key": _city_key(city) if online else "",
                "location": location,
                "socket_id": request.sid if online else None,
                "last_seen_at": utcnow_iso(),
            }
            presence_ref.set(payload, merge=True)
            emit("driver:presence_updated", payload)
            new_city_key = payload.get("city_key") or ""
            new_city = payload.get("city") or ""
            if prev_city_key and prev_city_key != new_city_key:
                _emit_online_count(
                    prev_city_key,
                    city=prev_city,
                    to_room=f"city_presence:{prev_city_key}",
                )
            if new_city_key:
                _emit_online_count(
                    new_city_key,
                    city=new_city,
                    to_room=f"city_presence:{new_city_key}",
                )

        @socketio.on("traveler:set_city", namespace="/rides")
        def on_traveler_set_city(data):
            ctx = _socket_users.get(request.sid)
            if not ctx or ctx.get("role") != "TRAVELER":
                _emit_error("Only travelers can subscribe to city presence.", "FORBIDDEN", request.sid)
                return

            next_city = ((data or {}).get("city") or "").strip()
            next_city_key = _city_key(next_city)
            prev_city_key = ctx.get("city_key") or ""
            if prev_city_key and prev_city_key != next_city_key:
                leave_room(f"city_presence:{prev_city_key}")

            ctx["city"] = next_city
            ctx["city_key"] = next_city_key
            if next_city_key:
                join_room(f"city_presence:{next_city_key}")
            _emit_online_count(next_city_key, city=next_city, to_sid=request.sid)

        @socketio.on("driver:location_update", namespace="/rides")
        def on_driver_location_update(data):
            ctx = _socket_users.get(request.sid)
            if not ctx or ctx.get("role") != "BUSINESS" or ctx.get("business_type") != "CAB_DRIVER":
                _emit_error("Only CAB_DRIVER business users can send location.", "FORBIDDEN", request.sid)
                return

            data = data or {}
            location = _normalize_location(data.get("location"))
            if not location:
                _emit_error("location with lat/lng is required.", "INVALID_LOCATION", request.sid)
                return

            db = get_firestore_client()
            db.collection("driver_presence").document(ctx["uid"]).set(
                {"location": location, "last_seen_at": utcnow_iso()},
                merge=True,
            )

            ride_id = data.get("ride_id")
            if not ride_id:
                emit("driver:location_ack", {"ok": True})
                return

            ride_ref = db.collection("rides").document(ride_id)
            ride_doc = ride_ref.get()
            if not ride_doc.exists:
                _emit_error("Ride not found.", "NOT_FOUND", request.sid)
                return

            ride = ride_doc.to_dict()
            if ride.get("driver_uid") != ctx["uid"]:
                _emit_error("You are not assigned to this ride.", "FORBIDDEN", request.sid)
                return

            status = ride.get("status")
            update_payload = {"driver_location": location, "updated_at": utcnow_iso()}
            next_status = status
            if status == RIDE_STATUS_QUOTE_ACCEPTED and can_transition(status, RIDE_STATUS_DRIVER_EN_ROUTE):
                next_status = RIDE_STATUS_DRIVER_EN_ROUTE
                update_payload["status"] = next_status

            if next_status in {RIDE_STATUS_QUOTE_ACCEPTED, RIDE_STATUS_DRIVER_EN_ROUTE}:
                eta_target = ride.get("source")
            elif next_status == RIDE_STATUS_IN_PROGRESS:
                eta_target = ride.get("destination")
            else:
                eta_target = None

            eta_minutes = estimate_eta_minutes(location, eta_target)
            if eta_minutes is not None:
                update_payload["eta_minutes"] = eta_minutes

            ride_ref.set(update_payload, merge=True)
            updated = ride_ref.get().to_dict()
            updated["id"] = ride_id

            if next_status != status:
                add_ride_event(db, ride_id, "DRIVER_EN_ROUTE", ctx["uid"], {})
                _emit_status(updated)
            _emit_location_and_eta(updated)
            emit("driver:location_ack", {"ok": True, "ride_id": ride_id, "eta_minutes": eta_minutes})

        @socketio.on("traveler:request_ride", namespace="/rides")
        def on_traveler_request_ride(data):
            ctx = _socket_users.get(request.sid)
            if not ctx or ctx.get("role") != "TRAVELER":
                _emit_error("Only travelers can request rides.", "FORBIDDEN", request.sid)
                return

            active = get_active_ride_for_traveler(ctx["uid"])
            if active:
                _emit_error("You already have an active ride.", "ACTIVE_RIDE_EXISTS", request.sid)
                _emit_to_user(ctx["uid"], "ride:status_changed", {"ride": active})
                return

            data = data or {}
            source_payload = data.get("source") or {}
            destination_payload = data.get("destination") or {}
            use_current_location = bool(data.get("use_current_location"))

            source_location = _normalize_location(source_payload)
            if source_location and use_current_location:
                source = reverse_geocode(source_location["lat"], source_location["lng"])
                if source and source_location.get("address"):
                    source["address"] = source_location["address"]
            elif source_location:
                source = reverse_geocode(source_location["lat"], source_location["lng"]) or source_location
            else:
                user_doc = get_user_doc(ctx["uid"]) or {}
                city_hint = user_doc.get("city") or ""
                source = forward_geocode(source_payload.get("address"), city_hint=city_hint)

            destination_location = _normalize_location(destination_payload)
            if destination_location:
                destination = reverse_geocode(destination_location["lat"], destination_location["lng"]) or destination_location
            else:
                destination = forward_geocode(
                    destination_payload.get("address"),
                    city_hint=(source or {}).get("city"),
                )

            if not source or not destination:
                _emit_error(
                    "Could not resolve source/destination. Please refine addresses.",
                    "GEOCODE_FAILED",
                    request.sid,
                )
                return

            city = source.get("city")
            if not city:
                _emit_error("Unable to determine city from source location.", "CITY_RESOLUTION_FAILED", request.sid)
                return

            ride = _create_ride_from_request(ctx["uid"], source, destination)
            join_room(f"ride:{ride['id']}")

            online_drivers = _presence_for_online_drivers(ride["city_key"])
            emit("rides:nearby_drivers", {"ride_id": ride["id"], "city": city, "count": len(online_drivers)})
            _emit_status(ride)

            for driver in online_drivers:
                driver_uid = driver.get("id")
                if not driver_uid:
                    continue
                _emit_to_user(
                    driver_uid,
                    "ride:request_received",
                    {
                        "ride": {
                            "id": ride["id"],
                            "city": ride["city"],
                            "source": ride["source"],
                            "destination": ride["destination"],
                            "traveler_name": ride.get("traveler_name"),
                            "status": ride["status"],
                            "created_at": ride["created_at"],
                        }
                    },
                )

            _schedule_request_timeout(ride["id"])

        @socketio.on("driver:accept_request", namespace="/rides")
        def on_driver_accept_request(data):
            ctx = _socket_users.get(request.sid)
            if not ctx or ctx.get("role") != "BUSINESS" or ctx.get("business_type") != "CAB_DRIVER":
                _emit_error("Only CAB_DRIVER business users can accept ride requests.", "FORBIDDEN", request.sid)
                return

            active_driver_ride = get_active_ride_for_driver(ctx["uid"])
            ride_id = (data or {}).get("ride_id")
            if not ride_id:
                _emit_error("ride_id is required.", "MISSING_FIELDS", request.sid)
                return

            if active_driver_ride and active_driver_ride.get("id") != ride_id:
                _emit_error("You already have an active ride.", "ACTIVE_RIDE_EXISTS", request.sid)
                return

            db = get_firestore_client()
            ride_ref = db.collection("rides").document(ride_id)
            user_doc = get_user_doc(ctx["uid"]) or {}
            driver_details = ((user_doc.get("business_profile") or {}).get("details") or {})
            presence_doc = db.collection("driver_presence").document(ctx["uid"]).get()
            presence = presence_doc.to_dict() if presence_doc.exists else {}
            if not presence.get("online"):
                _emit_error("Driver must be online to accept requests.", "DRIVER_OFFLINE", request.sid)
                return

            transaction = db.transaction()

            @firestore.transactional
            def _accept(transaction_obj):
                snapshot = ride_ref.get(transaction=transaction_obj)
                if not snapshot.exists:
                    raise ValueError("NOT_FOUND")
                ride = snapshot.to_dict()
                status = ride.get("status")
                if status != RIDE_STATUS_REQUESTED:
                    # Idempotent accept: same driver reopening the same request card.
                    if ride.get("driver_uid") == ctx["uid"] and status in {
                        RIDE_STATUS_ACCEPTED_PENDING_QUOTE,
                        RIDE_STATUS_QUOTE_SENT,
                        RIDE_STATUS_QUOTE_ACCEPTED,
                        RIDE_STATUS_DRIVER_EN_ROUTE,
                        RIDE_STATUS_IN_PROGRESS,
                    }:
                        ride["id"] = snapshot.id
                        return ride
                    if ride.get("driver_uid"):
                        raise ValueError("ALREADY_ACCEPTED_OTHER")
                    if status in {RIDE_STATUS_EXPIRED, RIDE_STATUS_CANCELLED, RIDE_STATUS_COMPLETED}:
                        raise ValueError("RIDE_CLOSED")
                    raise ValueError("RIDE_NOT_REQUESTED")
                if ride.get("city_key") and ride.get("city_key") != presence.get("city_key"):
                    raise ValueError("CITY_MISMATCH")

                now_iso = utcnow_iso()
                update_payload = {
                    "driver_uid": ctx["uid"],
                    "driver_name": driver_details.get("driver_name") or user_doc.get("display_name"),
                    "vehicle_type": driver_details.get("vehicle_type"),
                    "vehicle_number": driver_details.get("vehicle_number"),
                    "status": RIDE_STATUS_ACCEPTED_PENDING_QUOTE,
                    "accepted_at": now_iso,
                    "updated_at": now_iso,
                }
                transaction_obj.update(ride_ref, update_payload)
                ride.update(update_payload)
                return ride

            try:
                accepted_ride = _accept(transaction)
            except ValueError as e:
                error_code = str(e)
                if error_code == "NOT_FOUND":
                    _emit_error("Ride not found.", "NOT_FOUND", request.sid)
                elif error_code == "CITY_MISMATCH":
                    _emit_error("Ride city does not match your online city.", "CITY_MISMATCH", request.sid)
                elif error_code == "ALREADY_ACCEPTED_OTHER":
                    _emit_error("Ride already accepted by another driver.", "RIDE_NOT_AVAILABLE", request.sid)
                elif error_code == "RIDE_CLOSED":
                    _emit_error("Ride request is no longer active.", "RIDE_CLOSED", request.sid)
                else:
                    _emit_error("Ride is not in a request state.", "INVALID_STATE", request.sid)
                return
            except Exception:
                _emit_error("Failed to accept ride.", "ACCEPT_FAILED", request.sid)
                return

            _cancel_timer(_request_timers, ride_id)
            if accepted_ride.get("status") == RIDE_STATUS_ACCEPTED_PENDING_QUOTE:
                add_ride_event(db, ride_id, "RIDE_ACCEPTED", ctx["uid"], {})
            accepted_ride["id"] = ride_id
            join_room(f"ride:{ride_id}")
            _emit_to_user(
                accepted_ride["traveler_uid"],
                "ride:accepted",
                {"ride": accepted_ride},
            )
            _emit_status(accepted_ride)

        @socketio.on("driver:submit_quote", namespace="/rides")
        def on_driver_submit_quote(data):
            ctx = _socket_users.get(request.sid)
            if not ctx or ctx.get("role") != "BUSINESS" or ctx.get("business_type") != "CAB_DRIVER":
                _emit_error("Only CAB_DRIVER business users can submit quotes.", "FORBIDDEN", request.sid)
                return

            data = data or {}
            ride_id = data.get("ride_id")
            if not ride_id:
                _emit_error("ride_id is required.", "MISSING_FIELDS", request.sid)
                return

            try:
                price = float(data.get("price"))
            except (TypeError, ValueError):
                _emit_error("price must be a valid number.", "INVALID_PRICE", request.sid)
                return
            if price <= 0:
                _emit_error("price must be greater than zero.", "INVALID_PRICE", request.sid)
                return

            currency = str(data.get("currency") or "INR").strip().upper()
            note = str(data.get("note") or "").strip()

            db = get_firestore_client()
            ride_ref = db.collection("rides").document(ride_id)
            ride_doc = ride_ref.get()
            if not ride_doc.exists:
                _emit_error("Ride not found.", "NOT_FOUND", request.sid)
                return

            ride = ride_doc.to_dict()
            if ride.get("driver_uid") != ctx["uid"]:
                _emit_error("You are not assigned to this ride.", "FORBIDDEN", request.sid)
                return
            if ride.get("status") != RIDE_STATUS_ACCEPTED_PENDING_QUOTE:
                _emit_error("Quote can only be sent after accepting request.", "INVALID_STATE", request.sid)
                return

            now_iso = utcnow_iso()
            ride_ref.update(
                {
                    "quoted_price": price,
                    "currency": currency,
                    "quote_note": note or None,
                    "status": RIDE_STATUS_QUOTE_SENT,
                    "updated_at": now_iso,
                }
            )
            updated = ride_ref.get().to_dict()
            updated["id"] = ride_id
            add_ride_event(
                db,
                ride_id,
                "QUOTE_SENT",
                ctx["uid"],
                {"price": price, "currency": currency, "note": note},
            )
            _schedule_quote_timeout(ride_id)
            _emit_to_user(updated["traveler_uid"], "ride:quote_received", {"ride": updated})
            _emit_status(updated)

        @socketio.on("traveler:accept_quote", namespace="/rides")
        def on_traveler_accept_quote(data):
            ctx = _socket_users.get(request.sid)
            if not ctx or ctx.get("role") != "TRAVELER":
                _emit_error("Only travelers can accept quotes.", "FORBIDDEN", request.sid)
                return

            ride_id = (data or {}).get("ride_id")
            if not ride_id:
                _emit_error("ride_id is required.", "MISSING_FIELDS", request.sid)
                return

            db = get_firestore_client()
            ride_ref = db.collection("rides").document(ride_id)
            ride_doc = ride_ref.get()
            if not ride_doc.exists:
                _emit_error("Ride not found.", "NOT_FOUND", request.sid)
                return

            ride = ride_doc.to_dict()
            if ride.get("traveler_uid") != ctx["uid"]:
                _emit_error("You do not own this ride.", "FORBIDDEN", request.sid)
                return
            if ride.get("status") != RIDE_STATUS_QUOTE_SENT:
                _emit_error("Quote is not in an acceptable state.", "INVALID_STATE", request.sid)
                return

            start_otp = f"{random.randint(1000, 9999)}"
            ride_ref.update(
                {
                    "status": RIDE_STATUS_QUOTE_ACCEPTED,
                    "start_otp": start_otp,
                    "start_otp_created_at": utcnow_iso(),
                    "updated_at": utcnow_iso(),
                }
            )
            _cancel_timer(_quote_timers, ride_id)
            add_ride_event(db, ride_id, "QUOTE_ACCEPTED", ctx["uid"], {"start_otp_generated": True})
            updated = ride_ref.get().to_dict()
            updated["id"] = ride_id
            _emit_to_user(
                updated["traveler_uid"],
                "ride:otp_generated",
                {"ride_id": ride_id, "otp": start_otp},
            )
            _emit_to_user(updated["driver_uid"], "ride:quote_accepted", {"ride": _sanitize_ride_for_driver(updated)})
            _emit_status(updated)

        @socketio.on("traveler:reject_quote", namespace="/rides")
        def on_traveler_reject_quote(data):
            ctx = _socket_users.get(request.sid)
            if not ctx or ctx.get("role") != "TRAVELER":
                _emit_error("Only travelers can reject quotes.", "FORBIDDEN", request.sid)
                return

            ride_id = (data or {}).get("ride_id")
            if not ride_id:
                _emit_error("ride_id is required.", "MISSING_FIELDS", request.sid)
                return

            db = get_firestore_client()
            ride_ref = db.collection("rides").document(ride_id)
            ride_doc = ride_ref.get()
            if not ride_doc.exists:
                _emit_error("Ride not found.", "NOT_FOUND", request.sid)
                return
            ride = ride_doc.to_dict()
            if ride.get("traveler_uid") != ctx["uid"]:
                _emit_error("You do not own this ride.", "FORBIDDEN", request.sid)
                return
            if ride.get("status") != RIDE_STATUS_QUOTE_SENT:
                _emit_error("Only pending quotes can be rejected.", "INVALID_STATE", request.sid)
                return

            ride_ref.update({"status": RIDE_STATUS_CANCELLED, "updated_at": utcnow_iso()})
            _cancel_timer(_quote_timers, ride_id)
            add_ride_event(db, ride_id, "QUOTE_REJECTED", ctx["uid"], {})
            updated = ride_ref.get().to_dict()
            updated["id"] = ride_id
            _emit_status(updated)

        @socketio.on("driver:start_ride", namespace="/rides")
        def on_driver_start_ride(data):
            ctx = _socket_users.get(request.sid)
            if not ctx or ctx.get("role") != "BUSINESS" or ctx.get("business_type") != "CAB_DRIVER":
                _emit_error("Only CAB_DRIVER business users can start rides.", "FORBIDDEN", request.sid)
                return

            ride_id = (data or {}).get("ride_id")
            if not ride_id:
                _emit_error("ride_id is required.", "MISSING_FIELDS", request.sid)
                return
            submitted_otp = str((data or {}).get("otp") or "").strip()
            if not submitted_otp:
                _emit_error("OTP is required to start ride.", "OTP_REQUIRED", request.sid)
                return

            db = get_firestore_client()
            ride_ref = db.collection("rides").document(ride_id)
            ride_doc = ride_ref.get()
            if not ride_doc.exists:
                _emit_error("Ride not found.", "NOT_FOUND", request.sid)
                return
            ride = ride_doc.to_dict()
            if ride.get("driver_uid") != ctx["uid"]:
                _emit_error("You are not assigned to this ride.", "FORBIDDEN", request.sid)
                return

            status = ride.get("status")
            if status not in {RIDE_STATUS_QUOTE_ACCEPTED, RIDE_STATUS_DRIVER_EN_ROUTE}:
                _emit_error("Ride cannot be started from current status.", "INVALID_STATE", request.sid)
                return
            expected_otp = str(ride.get("start_otp") or "").strip()
            if not expected_otp:
                _emit_error("Ride OTP is unavailable. Ask traveler to re-accept quote.", "OTP_NOT_AVAILABLE", request.sid)
                return
            if submitted_otp != expected_otp:
                _emit_error("Incorrect OTP. Please verify with traveler.", "OTP_INVALID", request.sid)
                return

            ride_ref.update(
                {
                    "status": RIDE_STATUS_IN_PROGRESS,
                    "started_at": utcnow_iso(),
                    "start_otp_verified_at": utcnow_iso(),
                    "start_otp": None,
                    "updated_at": utcnow_iso(),
                }
            )
            updated = ride_ref.get().to_dict()
            updated["id"] = ride_id
            add_ride_event(db, ride_id, "RIDE_STARTED", ctx["uid"], {})
            _emit_status(updated)

        @socketio.on("traveler:end_ride", namespace="/rides")
        def on_traveler_end_ride(data):
            ctx = _socket_users.get(request.sid)
            if not ctx or ctx.get("role") != "TRAVELER":
                _emit_error("Only travelers can end rides.", "FORBIDDEN", request.sid)
                return

            ride_id = (data or {}).get("ride_id")
            if not ride_id:
                _emit_error("ride_id is required.", "MISSING_FIELDS", request.sid)
                return

            _, err_code, err_message = _end_ride_internal(ride_id, ctx["uid"])
            if err_code:
                _emit_error(err_message, err_code, request.sid)

        _handlers_registered = True
