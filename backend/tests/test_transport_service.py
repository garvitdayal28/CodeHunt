from app.services.transport_service import search_flights, search_trains


def test_search_flights_normalizes_results(monkeypatch):
    monkeypatch.setenv("RAPIDAPI_KEY", "demo")

    def fake_request(_host, _path, _params):
        return {
            "data": [
                {
                    "departure": "DEL 08:00",
                    "arrival": "GOI 10:10",
                    "airline": "IndiGo",
                    "durationText": "2h 10m",
                    "price": {"amount": 5400, "currency": "INR"},
                    "deeplink": "https://example.com/flight",
                }
            ]
        }

    monkeypatch.setattr("app.services.transport_service._request", fake_request)
    options = search_flights({"origin": "DEL", "destination": "GOI", "date": "2026-03-20", "travelers": 1})
    assert len(options) == 1
    assert options[0]["mode"] == "FLIGHT"
    assert options[0]["is_live"] is True
    assert options[0]["booking_url"] == "https://example.com/flight"


def test_search_trains_normalizes_results(monkeypatch):
    monkeypatch.setenv("RAPIDAPI_KEY", "demo")

    def fake_request(_host, _path, _params):
        return {
            "data": [
                {
                    "from": "NDLS 07:15",
                    "to": "JP 12:20",
                    "name": "Shatabdi",
                    "duration": "5h 05m",
                    "fare": 1200,
                    "url": "https://example.com/train",
                }
            ]
        }

    monkeypatch.setattr("app.services.transport_service._request", fake_request)
    options = search_trains({"origin": "NDLS", "destination": "JP", "date": "2026-03-20"})
    assert len(options) == 1
    assert options[0]["mode"] == "TRAIN"
    assert options[0]["price"] == 1200
    assert options[0]["booking_url"] == "https://example.com/train"
