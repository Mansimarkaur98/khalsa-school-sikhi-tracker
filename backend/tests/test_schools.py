def test_list_schools_is_public(client, fraser_valley, newton):
    response = client.get("/api/v1/schools")
    assert response.status_code == 200
    names = sorted(s["name"] for s in response.json())
    assert names == sorted([fraser_valley.name, newton.name])


def test_list_schools_empty_when_none_exist(client):
    response = client.get("/api/v1/schools")
    assert response.status_code == 200
    assert response.json() == []
