"""Pinecone vector store helpers for RAG retrieval."""

import logging
import os
import threading

logger = logging.getLogger(__name__)

_client = None
_index = None
_index_name = None
_lock = threading.Lock()
_pinecone_cls = None
_serverless_spec_cls = None


def is_pinecone_configured():
    return bool(os.getenv("PINECONE_API_KEY") or os.getenv("PINECONE_KEY"))


def get_namespace():
    return os.getenv("PINECONE_NAMESPACE", "")


def get_index_name():
    return os.getenv("PINECONE_INDEX", "tripallied-rag")


def _get_api_key():
    return os.getenv("PINECONE_API_KEY") or os.getenv("PINECONE_KEY")


def _get_client():
    global _client, _pinecone_cls, _serverless_spec_cls
    if _client is not None:
        return _client
    api_key = _get_api_key()
    if not api_key:
        return None
    with _lock:
        if _client is None:
            if _pinecone_cls is None:
                try:
                    from pinecone import Pinecone, ServerlessSpec
                except Exception as exc:
                    logger.warning("Pinecone SDK unavailable: %s", exc)
                    return None
                _pinecone_cls = Pinecone
                _serverless_spec_cls = ServerlessSpec
            _client = _pinecone_cls(api_key=api_key)
    return _client


def init_index(dimension=384):
    """Create or connect to configured Pinecone index."""
    global _index, _index_name
    if _index is not None and _index_name == get_index_name():
        return _index

    client = _get_client()
    if client is None:
        return None

    with _lock:
        index_name = get_index_name()
        if _index is not None and _index_name == index_name:
            return _index

        try:
            listing = client.list_indexes()
            if hasattr(listing, "names"):
                names = list(listing.names())
            elif isinstance(listing, list):
                names = []
                for idx in listing:
                    if isinstance(idx, dict):
                        names.append(idx.get("name"))
                    elif hasattr(idx, "name"):
                        names.append(getattr(idx, "name"))
            else:
                names = []
        except Exception:
            names = []

        if index_name not in names:
            cloud = os.getenv("PINECONE_CLOUD", "aws")
            region = os.getenv("PINECONE_REGION", "us-east-1")
            try:
                if _serverless_spec_cls is None:
                    raise RuntimeError("Pinecone serverless spec unavailable")
                client.create_index(
                    name=index_name,
                    dimension=int(dimension),
                    metric="cosine",
                    spec=_serverless_spec_cls(cloud=cloud, region=region),
                )
                logger.info("Created Pinecone index %s (%s/%s)", index_name, cloud, region)
            except Exception as exc:
                logger.warning("Unable to create Pinecone index %s: %s", index_name, exc)
                return None

        try:
            _index = client.Index(index_name)
            _index_name = index_name
        except Exception as exc:
            logger.warning("Unable to connect Pinecone index %s: %s", index_name, exc)
            return None
    return _index


def upsert_vectors(items):
    """
    Upsert vectors.
    items: list[{id, values, metadata}]
    """
    if not items:
        return 0
    index = init_index(dimension=len(items[0].get("values") or [] or [0]))
    if index is None:
        return 0
    try:
        index.upsert(vectors=items, namespace=get_namespace())
        return len(items)
    except Exception as exc:
        logger.warning("Pinecone upsert failed: %s", exc)
        return 0


def delete_vector(vector_id):
    if not vector_id:
        return
    index = init_index()
    if index is None:
        return
    try:
        index.delete(ids=[vector_id], namespace=get_namespace())
    except Exception as exc:
        logger.warning("Pinecone delete failed for %s: %s", vector_id, exc)


def query_vector(vector, top_k=8, metadata_filter=None):
    if not vector:
        logger.warning("[PINECONE_QUERY] Empty vector — skipping query")
        return []
    index = init_index(dimension=len(vector))
    if index is None:
        logger.warning("[PINECONE_QUERY] Index is None — Pinecone not configured or unavailable")
        return []

    ns = get_namespace()
    logger.info(
        "[PINECONE_QUERY] Querying index=%s namespace=%s top_k=%d filter=%s vector_dim=%d",
        get_index_name(), ns, int(top_k), metadata_filter, len(vector),
    )
    try:
        response = index.query(
            vector=vector,
            top_k=int(top_k),
            namespace=ns,
            include_metadata=True,
            filter=metadata_filter or None,
        )
    except Exception as exc:
        logger.warning("[PINECONE_QUERY] Query FAILED: %s", exc)
        return []

    matches = getattr(response, "matches", None)
    if matches is None and isinstance(response, dict):
        matches = response.get("matches", [])
    if not matches:
        logger.warning("[PINECONE_QUERY] 0 matches from Pinecone — index may be empty or namespace mismatch")
        return []

    logger.info("[PINECONE_QUERY] Got %d matches — top_score=%.4f", len(matches),
                float(getattr(matches[0], "score", 0) if hasattr(matches[0], "score") else (matches[0].get("score", 0) if isinstance(matches[0], dict) else 0)))

    normalized = []
    for item in matches:
        if isinstance(item, dict):
            normalized.append(
                {
                    "id": item.get("id"),
                    "score": float(item.get("score", 0) or 0),
                    "metadata": item.get("metadata") or {},
                }
            )
            continue
        normalized.append(
            {
                "id": getattr(item, "id", ""),
                "score": float(getattr(item, "score", 0) or 0),
                "metadata": getattr(item, "metadata", {}) or {},
            }
        )
    return normalized
