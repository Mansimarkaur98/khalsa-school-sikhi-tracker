def test_health_check(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_school_fixture_persists_within_test(client, fraser_valley):
    response = client.get("/api/v1/schools")
    assert response.status_code == 200
    names = [s["name"] for s in response.json()]
    assert "Khalsa School Fraser Valley" in names


def test_school_fixture_does_not_leak_into_next_test(client):
    response = client.get("/api/v1/schools")
    assert response.status_code == 200
    assert response.json() == []
