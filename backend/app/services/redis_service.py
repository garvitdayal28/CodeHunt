"""
Redis connection and utilities.
Used for caching (hotel/tour listings) and pub/sub (disruption events for SSE).
Falls back to an in-memory dict cache when Redis is unavailable.
"""

import json
import time
import redis

_redis_client = None

# In-memory fallback cache: {key: (value, expires_at)}
_mem_cache: dict = {}


def init_redis(app):
    """Initialize the Redis connection using the app's REDIS_URL config."""
    global _redis_client

    redis_url = app.config.get("REDIS_URL", "redis://localhost:6379/0")

    try:
        _redis_client = redis.from_url(redis_url, decode_responses=True, socket_connect_timeout=2)
        _redis_client.ping()
        app.logger.info("Redis connected successfully.")
    except Exception:
        _redis_client = None
        app.logger.info("Redis unavailable — using in-memory cache fallback.")


def get_redis_client():
    """Return the Redis client instance (may be None if Redis is unavailable)."""
    return _redis_client


# ──────────────────────────────────────────────
# Caching helpers (Redis with in-memory fallback)
# ──────────────────────────────────────────────

def cache_get(key):
    """Get a cached value by key. Returns parsed JSON or None."""
    client = get_redis_client()
    if client is not None:
        try:
            val = client.get(key)
            return json.loads(val) if val else None
        except Exception:
            pass
    # In-memory fallback
    entry = _mem_cache.get(key)
    if entry:
        value, expires_at = entry
        if expires_at is None or time.time() < expires_at:
            return value
        del _mem_cache[key]
    return None


def cache_set(key, value, ttl=300):
    """Cache a value with a TTL in seconds (default 5 minutes)."""
    client = get_redis_client()
    if client is not None:
        try:
            client.setex(key, ttl, json.dumps(value))
            return
        except Exception:
            pass
    # In-memory fallback
    expires_at = time.time() + ttl if ttl else None
    _mem_cache[key] = (value, expires_at)


def cache_delete(key):
    """Delete a cached key."""
    client = get_redis_client()
    if client is not None:
        try:
            client.delete(key)
            return
        except Exception:
            pass
    # In-memory fallback
    _mem_cache.pop(key, None)


def cache_delete_prefix(prefix):
    """Delete all cached keys matching a prefix."""
    if not prefix:
        return

    client = get_redis_client()
    if client is not None:
        try:
            cursor = 0
            pattern = f"{prefix}*"
            while True:
                cursor, keys = client.scan(cursor=cursor, match=pattern, count=200)
                if keys:
                    client.delete(*keys)
                if cursor == 0:
                    break
        except Exception:
            pass

    for key in list(_mem_cache.keys()):
        if key.startswith(prefix):
            _mem_cache.pop(key, None)


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
