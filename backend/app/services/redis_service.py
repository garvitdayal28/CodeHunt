"""
Redis connection and utilities.
Used for caching (hotel/tour listings) and pub/sub (disruption events for SSE).
"""

import json
import redis

_redis_client = None


def init_redis(app):
    """Initialize the Redis connection using the app's REDIS_URL config."""
    global _redis_client

    redis_url = app.config.get("REDIS_URL", "redis://localhost:6379/0")

    try:
        _redis_client = redis.from_url(redis_url, decode_responses=True)
        _redis_client.ping()
        app.logger.info("Redis connected successfully.")
    except redis.ConnectionError as e:
        app.logger.warning(f"Redis connection failed: {e}. Caching and SSE pub/sub will be unavailable.")
        _redis_client = None


def get_redis_client():
    """Return the Redis client instance (may be None if Redis is unavailable)."""
    return _redis_client


# ──────────────────────────────────────────────
# Caching helpers
# ──────────────────────────────────────────────

def cache_get(key):
    """Get a cached value by key. Returns parsed JSON or None."""
    client = get_redis_client()
    if client is None:
        return None
    try:
        val = client.get(key)
        return json.loads(val) if val else None
    except Exception:
        return None


def cache_set(key, value, ttl=300):
    """Cache a value with a TTL (default 5 minutes)."""
    client = get_redis_client()
    if client is None:
        return
    try:
        client.setex(key, ttl, json.dumps(value))
    except Exception:
        pass


def cache_delete(key):
    """Delete a cached key."""
    client = get_redis_client()
    if client is None:
        return
    try:
        client.delete(key)
    except Exception:
        pass


# ──────────────────────────────────────────────
# Pub/Sub helpers (for Disruption Engine → SSE)
# ──────────────────────────────────────────────

def publish_event(channel, data):
    """Publish an event to a Redis pub/sub channel."""
    client = get_redis_client()
    if client is None:
        return
    try:
        client.publish(channel, json.dumps(data))
    except Exception:
        pass


def subscribe_channel(channel):
    """
    Subscribe to a Redis pub/sub channel.
    Returns a pubsub object that can be iterated for messages.
    """
    client = get_redis_client()
    if client is None:
        return None
    try:
        pubsub = client.pubsub()
        pubsub.subscribe(channel)
        return pubsub
    except Exception:
        return None
