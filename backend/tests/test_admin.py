def test_teacher_cannot_list_users(client, teacher_headers):
    response = client.get("/api/v1/admin/users", headers=teacher_headers)
    assert response.status_code == 403


def test_admin_can_list_users(client, admin_headers, admin_user, teacher_user):
    response = client.get("/api/v1/admin/users", headers=admin_headers)
    assert response.status_code == 200
    emails = {u["email"] for u in response.json()}
    assert emails == {admin_user.email, teacher_user.email}


def test_admin_can_update_user_school(client, admin_headers, teacher_user, newton):
    response = client.put(
        f"/api/v1/admin/users/{teacher_user.id}/school",
        json={"school_id": newton.id},
        headers=admin_headers,
    )
    assert response.status_code == 200
    assert response.json()["school_id"] == newton.id


def test_admin_update_school_rejects_invalid_school(client, admin_headers, teacher_user):
    response = client.put(
        f"/api/v1/admin/users/{teacher_user.id}/school",
        json={"school_id": 999999},
        headers=admin_headers,
    )
    assert response.status_code == 400


def test_teacher_cannot_update_user_school(client, teacher_headers, teacher_user):
    response = client.put(
        f"/api/v1/admin/users/{teacher_user.id}/school",
        json={"school_id": teacher_user.school_id},
        headers=teacher_headers,
    )
    assert response.status_code == 403


def test_admin_can_delete_teacher(client, admin_headers, teacher_user):
    response = client.delete(f"/api/v1/admin/users/{teacher_user.id}", headers=admin_headers)
    assert response.status_code == 204

    list_response = client.get("/api/v1/admin/users", headers=admin_headers)
    emails = {u["email"] for u in list_response.json()}
    assert teacher_user.email not in emails


def test_admin_cannot_delete_own_account(client, admin_headers, admin_user):
    response = client.delete(f"/api/v1/admin/users/{admin_user.id}", headers=admin_headers)
    assert response.status_code == 400


def test_admin_can_delete_a_second_admin_when_not_the_last_one(client, db, admin_headers, admin_user, fraser_valley):
    from tests.conftest import make_user

    second_admin = make_user(db, "second.admin.test@khalsaschool.ca", role="admin", school_id=fraser_valley.id)
    response = client.delete(f"/api/v1/admin/users/{second_admin.id}", headers=admin_headers)
    assert response.status_code == 204
