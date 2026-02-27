"""RAG indexing and retrieval operations backed by Pinecone."""

import logging
import os

from app.services.embedding_service import embed_text, embed_texts
from app.services.pinecone_service import delete_vector, query_vector, upsert_vectors
from app.services.rag_document_builder import (
    ENTITY_GUIDE_SERVICE,
    ENTITY_HOTEL,
    ENTITY_RESTAURANT,
    ENTITY_TOUR,
    build_all_documents,
    build_entity_document,
)

logger = logging.getLogger(__name__)

ALL_ENTITY_TYPES = {ENTITY_HOTEL, ENTITY_RESTAURANT, ENTITY_TOUR, ENTITY_GUIDE_SERVICE}


def _to_float(value, fallback=0.0):
    try:
        return float(value)
    except (TypeError, ValueError):
        return fallback


def _to_int(value, fallback=0):
    try:
        return int(value)
    except (TypeError, ValueError):
        return fallback


def get_rag_top_k():
    return _to_int(os.getenv("RAG_TOP_K", "8"), 8)


def get_rag_score_threshold():
    return _to_float(os.getenv("RAG_SCORE_THRESHOLD", "0.45"), 0.45)


def _doc_to_vector_payload(doc, vector):
    metadata = dict(doc.get("metadata") or {})
    metadata.update(
        {
            "entity_type": doc.get("entity_type"),
            "entity_id": doc.get("entity_id"),
            "title": doc.get("title"),
            "text": doc.get("text"),
        }
    )
    return {
        "id": doc.get("vector_id"),
        "values": vector,
        "metadata": metadata,
    }


def full_reindex(dry_run=False):
    docs = build_all_documents()
    if not docs:
        return {"indexed": 0, "total": 0}
    if dry_run:
        return {"indexed": 0, "total": len(docs), "dry_run": True}

    try:
        vectors = embed_texts([doc.get("text", "") for doc in docs])
    except Exception as exc:
        logger.warning("Embedding generation failed for full reindex: %s", exc)
        return {"indexed": 0, "total": len(docs), "error": str(exc)}
    payload = []
    for idx, doc in enumerate(docs):
        if idx >= len(vectors):
            break
        payload.append(_doc_to_vector_payload(doc, vectors[idx]))
    indexed = upsert_vectors(payload)
    return {"indexed": indexed, "total": len(docs)}


def upsert_entity(entity_type, entity_id, dry_run=False):
    doc = build_entity_document(entity_type, entity_id)
    if not doc:
        return {"indexed": 0, "found": False}
    if dry_run:
        return {"indexed": 0, "found": True, "dry_run": True, "vector_id": doc.get("vector_id")}

    try:
        vector = embed_text(doc.get("text", ""))
    except Exception as exc:
        logger.warning("Embedding generation failed for %s:%s -> %s", entity_type, entity_id, exc)
        return {"indexed": 0, "found": True, "vector_id": doc.get("vector_id"), "error": str(exc)}
    if not vector:
        return {"indexed": 0, "found": True, "vector_id": doc.get("vector_id")}
    indexed = upsert_vectors([_doc_to_vector_payload(doc, vector)])
    return {"indexed": indexed, "found": True, "vector_id": doc.get("vector_id")}


def delete_entity(entity_type, entity_id, dry_run=False):
    entity_type = str(entity_type or "").strip().upper()
    if entity_type not in ALL_ENTITY_TYPES:
        return {"deleted": False, "reason": "unknown_entity_type"}
    vector_id = f"{entity_type}:{entity_id}"
    if dry_run:
        return {"deleted": False, "dry_run": True, "vector_id": vector_id}
    delete_vector(vector_id)
    return {"deleted": True, "vector_id": vector_id}


def retrieve(query_text, top_k=None, entity_types=None):
    """Retrieve semantic matches for planner RAG."""
    effective_top_k = top_k or get_rag_top_k()
    logger.info(
        "[RAG_RETRIEVE] query=%r top_k=%d entity_types=%s threshold=%.3f",
        (query_text or "")[:120], effective_top_k, entity_types, get_rag_score_threshold(),
    )
    try:
        vector = embed_text(query_text or "")
    except Exception as exc:
        logger.warning("[RAG_RETRIEVE] Embedding generation FAILED: %s", exc)
        return []
    if not vector:
        logger.warning("[RAG_RETRIEVE] embed_text returned empty vector — aborting retrieval")
        return []
    logger.debug("[RAG_RETRIEVE] Embedding OK — vector_dim=%d first_3=%s", len(vector), vector[:3])

    metadata_filter = None
    if entity_types:
        norm_types = [str(item).strip().upper() for item in entity_types if str(item).strip()]
        if norm_types:
            metadata_filter = {"entity_type": {"$in": norm_types}}

    matches = query_vector(vector, top_k=effective_top_k, metadata_filter=metadata_filter)
    logger.info(
        "[RAG_RETRIEVE] Pinecone returned %d raw matches (filter=%s)",
        len(matches), metadata_filter,
    )
    results = []
    for match in matches:
        md = match.get("metadata") or {}
        score = _to_float(match.get("score"))
        results.append(
            {
                "id": match.get("id"),
                "score": score,
                "entity_type": md.get("entity_type"),
                "entity_id": md.get("entity_id"),
                "title": md.get("title"),
                "text": md.get("text"),
                "metadata": md,
            }
        )
    if results:
        logger.info(
            "[RAG_RETRIEVE] Returning %d results — top_score=%.4f top_id=%s top_title=%r",
            len(results), results[0]["score"], results[0]["id"], (results[0].get("title") or "")[:60],
        )
    else:
        logger.warning("[RAG_RETRIEVE] 0 results returned — possible causes: empty index, bad query, or Pinecone misconfigured")
    return results


def retrieval_stats(matches):
    if not matches:
        logger.info("[RAG_STATS] No matches — confidence=low")
        return {"count": 0, "top_score": 0.0, "avg_score": 0.0, "confidence": "low"}
    scores = [_to_float(item.get("score")) for item in matches]
    top_score = max(scores)
    avg_score = sum(scores) / len(scores)
    threshold = get_rag_score_threshold()
    confidence = "high" if top_score >= threshold else "low"
    logger.info(
        "[RAG_STATS] count=%d top=%.4f avg=%.4f threshold=%.3f → confidence=%s",
        len(matches), top_score, avg_score, threshold, confidence,
    )
    return {
        "count": len(matches),
        "top_score": round(top_score, 4),
        "avg_score": round(avg_score, 4),
        "confidence": confidence,
    }
