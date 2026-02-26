from app.services.planner_schemas import validate_create_session_payload


def test_validate_create_session_payload_success():
    payload, err = validate_create_session_payload(
        {
            "origin": "Delhi",
            "destination": "Goa, India",
            "start_date": "2026-03-20",
            "end_date": "2026-03-25",
            "trip_days": 6,
            "travelers": 2,
            "budget": "mid-range",
            "interests": ["beach", "food"],
            "transport_modes": ["flight", "train"],
            "notes": "need family friendly options",
        }
    )
    assert err is None
    assert payload["destination"] == "Goa, India"
    assert payload["budget"] == "MID_RANGE"
    assert payload["transport_modes"] == ["FLIGHT", "TRAIN"]


def test_validate_create_session_payload_rejects_invalid_dates():
    payload, err = validate_create_session_payload(
        {
            "destination": "Jaipur",
            "start_date": "2026-03-20",
            "end_date": "2026-03-10",
        }
    )
    assert payload is None
    assert "end_date" in err


def test_validate_create_session_payload_defaults():
    payload, err = validate_create_session_payload({"destination": "Manali"})
    assert err is None
    assert payload["origin"] == "India"
    assert payload["budget"] == "MID_RANGE"
    assert payload["trip_days"] == 3
