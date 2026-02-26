"""Embedding service wrapper around Hugging Face sentence-transformers."""

import logging
import os
import threading

import numpy as np

logger = logging.getLogger(__name__)

_model = None
_model_name = None
_lock = threading.Lock()


def get_embedding_model_name():
    return os.getenv("HF_EMBED_MODEL", "sentence-transformers/all-MiniLM-L6-v2")


def _load_model():
    global _model, _model_name
    model_name = get_embedding_model_name()
    if _model is not None and _model_name == model_name:
        return _model

    with _lock:
        if _model is not None and _model_name == model_name:
            return _model
        logger.info("Loading embedding model: %s", model_name)
        try:
            from sentence_transformers import SentenceTransformer
        except Exception as exc:
            raise RuntimeError(f"sentence-transformers unavailable: {exc}") from exc
        _model = SentenceTransformer(model_name)
        _model_name = model_name
    return _model


def embed_texts(texts):
    """Embed a list of strings and return a list of float lists."""
    if not isinstance(texts, list) or not texts:
        return []
    model = _load_model()
    vectors = model.encode(
        texts,
        normalize_embeddings=True,
        show_progress_bar=False,
        convert_to_numpy=True,
    )
    if isinstance(vectors, np.ndarray):
        return vectors.astype(np.float32).tolist()
    return [list(vec) for vec in vectors]


def embed_text(text):
    vector_list = embed_texts([text or ""])
    return vector_list[0] if vector_list else []
