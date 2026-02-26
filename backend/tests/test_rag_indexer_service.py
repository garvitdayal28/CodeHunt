from app.services.rag_indexer_service import retrieval_stats


def test_retrieval_stats_low_when_empty():
    stats = retrieval_stats([])
    assert stats["count"] == 0
    assert stats["confidence"] == "low"


def test_retrieval_stats_high_when_top_score_crosses_threshold(monkeypatch):
    monkeypatch.setenv("RAG_SCORE_THRESHOLD", "0.50")
    stats = retrieval_stats(
        [
            {"score": 0.72},
            {"score": 0.61},
            {"score": 0.55},
        ]
    )
    assert stats["count"] == 3
    assert stats["top_score"] == 0.72
    assert stats["confidence"] == "high"
