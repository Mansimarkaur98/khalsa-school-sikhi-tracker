from app import models


def test_list_categories_requires_auth(client):
    response = client.get("/api/v1/categories")
    assert response.status_code in (401, 403)


def test_teacher_sees_only_active_categories(client, teacher_headers, category, db):
    cat, level = category
    inactive_cat = models.Category(category_name="Inactive Category", active=False)
    db.add(inactive_cat)
    db.commit()

    response = client.get("/api/v1/categories", headers=teacher_headers)
    assert response.status_code == 200
    names = [c["category_name"] for c in response.json()]
    assert names == [cat.category_name]


def test_teacher_include_inactive_param_is_ignored(client, teacher_headers, category, db):
    db.add(models.Category(category_name="Inactive Category", active=False))
    db.commit()

    response = client.get("/api/v1/categories?include_inactive=true", headers=teacher_headers)
    names = [c["category_name"] for c in response.json()]
    assert "Inactive Category" not in names


def test_admin_can_see_inactive_categories_with_flag(client, admin_headers, category, db):
    db.add(models.Category(category_name="Inactive Category", active=False))
    db.commit()

    response = client.get("/api/v1/categories?include_inactive=true", headers=admin_headers)
    names = [c["category_name"] for c in response.json()]
    assert "Inactive Category" in names


def test_teacher_cannot_create_category(client, teacher_headers):
    response = client.post("/api/v1/categories", json={"category_name": "New Category"}, headers=teacher_headers)
    assert response.status_code == 403


def test_admin_can_create_category(client, admin_headers):
    response = client.post("/api/v1/categories", json={"category_name": "New Category"}, headers=admin_headers)
    assert response.status_code == 201
    assert response.json()["active"] is True


def test_admin_cannot_create_duplicate_category_name(client, admin_headers, category):
    cat, _ = category
    response = client.post("/api/v1/categories", json={"category_name": cat.category_name}, headers=admin_headers)
    assert response.status_code == 409


def test_admin_can_rename_category(client, admin_headers, category):
    cat, _ = category
    response = client.put(
        f"/api/v1/categories/{cat.id}", json={"category_name": "Renamed"}, headers=admin_headers
    )
    assert response.status_code == 200
    assert response.json()["category_name"] == "Renamed"


def test_admin_can_deactivate_and_restore_category(client, admin_headers, category):
    cat, _ = category
    deactivate_response = client.delete(f"/api/v1/categories/{cat.id}", headers=admin_headers)
    assert deactivate_response.status_code == 204

    listed = client.get("/api/v1/categories", headers=admin_headers)
    assert listed.json() == []

    restore_response = client.post(f"/api/v1/categories/{cat.id}/restore", headers=admin_headers)
    assert restore_response.status_code == 200
    assert restore_response.json()["active"] is True


def test_teacher_can_list_levels_but_not_create(client, teacher_headers, category):
    cat, level = category
    list_response = client.get(f"/api/v1/categories/{cat.id}/levels", headers=teacher_headers)
    assert list_response.status_code == 200
    assert len(list_response.json()) == 1

    create_response = client.post(
        f"/api/v1/categories/{cat.id}/levels",
        json={"level_number": 2, "description": "Level 2"},
        headers=teacher_headers,
    )
    assert create_response.status_code == 403


def test_admin_can_create_level(client, admin_headers, category):
    cat, _ = category
    response = client.post(
        f"/api/v1/categories/{cat.id}/levels",
        json={"level_number": 2, "description": "Level 2"},
        headers=admin_headers,
    )
    assert response.status_code == 201


def test_admin_cannot_create_duplicate_level_number(client, admin_headers, category):
    cat, level = category
    response = client.post(
        f"/api/v1/categories/{cat.id}/levels",
        json={"level_number": level.level_number, "description": "Duplicate"},
        headers=admin_headers,
    )
    assert response.status_code == 409


def test_admin_can_edit_level(client, admin_headers, category):
    cat, level = category
    response = client.put(
        f"/api/v1/categories/{cat.id}/levels/{level.id}",
        json={"level_number": level.level_number, "description": "Updated description"},
        headers=admin_headers,
    )
    assert response.status_code == 200
    assert response.json()["description"] == "Updated description"


def test_admin_can_deactivate_and_restore_level(client, admin_headers, category):
    cat, level = category
    deactivate_response = client.delete(f"/api/v1/categories/{cat.id}/levels/{level.id}", headers=admin_headers)
    assert deactivate_response.status_code == 204

    listed = client.get(f"/api/v1/categories/{cat.id}/levels", headers=admin_headers)
    assert listed.json() == []

    restore_response = client.post(f"/api/v1/categories/{cat.id}/levels/{level.id}/restore", headers=admin_headers)
    assert restore_response.status_code == 200
    assert restore_response.json()["active"] is True
