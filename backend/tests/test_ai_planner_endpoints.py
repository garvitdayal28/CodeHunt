from types import SimpleNamespace

from app import create_app


def _headers():
    return {"Authorization": "Bearer test-token"}


def _auth_claims(role="TRAVELER"):
    return {"uid": "traveler-1", "email": "t@example.com", "role": role}


def test_create_planner_session_endpoint(monkeypatch):
    app = create_app("development")
    client = app.test_client()

    monkeypatch.setattr("app.utils.auth.verify_firebase_token", lambda _token: _auth_claims())
    monkeypatch.setattr(
        "app.blueprints.ai.create_session",
        lambda traveler_uid, planner_input: {
            "id": "session-1",
            "status": "QUEUED",
            "input": planner_input,
            "created_at": "2026-01-01T00:00:00",
        },
    )
    monkeypatch.setattr("app.blueprints.ai.run_session", lambda _session_id: None)
    monkeypatch.setattr(
        "app.blueprints.ai.get_socketio",
        lambda: SimpleNamespace(start_background_task=lambda *_args, **_kwargs: None),
    )

    response = client.post(
        "/api/ai/planner/sessions",
        headers=_headers(),
        json={"destination": "Goa, India"},
    )
    assert response.status_code == 201
    data = response.get_json()["data"]
    assert data["id"] == "session-1"


def test_list_planner_sessions_endpoint(monkeypatch):
    app = create_app("development")
    client = app.test_client()

    monkeypatch.setattr("app.utils.auth.verify_firebase_token", lambda _token: _auth_claims())
    monkeypatch.setattr(
        "app.blueprints.ai.list_sessions",
        lambda uid, limit=20: [{"id": "s1", "traveler_uid": uid, "status": "COMPLETED"}],
    )

    response = client.get("/api/ai/planner/sessions", headers=_headers())
    assert response.status_code == 200
    rows = response.get_json()["data"]
    assert rows[0]["id"] == "s1"


def test_cancel_planner_session_endpoint(monkeypatch):
    app = create_app("development")
    client = app.test_client()

    monkeypatch.setattr("app.utils.auth.verify_firebase_token", lambda _token: _auth_claims())
    monkeypatch.setattr(
        "app.blueprints.ai.cancel_session",
        lambda session_id, traveler_uid: (True, None, None),
    )

    response = client.post("/api/ai/planner/sessions/s1/cancel", headers=_headers())
    assert response.status_code == 200
    assert response.get_json()["data"]["status"] == "CANCELLED"
