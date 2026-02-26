"""
Events Blueprint — Server-Sent Events (SSE) stream for real-time admin alerts.
"""

import json
from flask import Blueprint, Response, g
from app.utils.auth import require_auth
from app.services.redis_service import subscribe_channel

events_bp = Blueprint("events", __name__, url_prefix="/api/events")


@events_bp.route("/stream", methods=["GET"])
@require_auth
def sse_stream():
    """
    SSE endpoint — admin clients connect here to receive live alerts.
    Subscribes to the Redis 'disruptions' pub/sub channel and pushes
    events down the stream as they arrive.
    """
    def generate():
        pubsub = subscribe_channel("disruptions")

        if pubsub is None:
            # Redis unavailable — send heartbeat only
            yield "data: {\"event_type\": \"CONNECTED\", \"message\": \"SSE connected (no Redis)\"}\n\n"
            return

        yield "data: {\"event_type\": \"CONNECTED\", \"message\": \"SSE stream connected\"}\n\n"

        for message in pubsub.listen():
            if message["type"] == "message":
                data = message["data"]
                yield f"data: {data}\n\n"

    return Response(
        generate(),
        mimetype="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
