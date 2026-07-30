from datetime import datetime, timedelta, timezone

from sqlalchemy import select

from app import models


def signup_payload(school_id, **overrides):
    payload = {
        "first_name": "New",
        "last_name": "Teacher",
        "school_id": school_id,
        "email": "newteacher@khalsaschool.ca",
        "password": "validpass123",
    }
    payload.update(overrides)
    return payload


def test_signup_rejects_non_khalsa_domain(client, fraser_valley):
    response = client.post(
        "/api/v1/auth/signup",
        json=signup_payload(fraser_valley.id, email="someone@gmail.com"),
    )
    assert response.status_code == 422


def test_signup_rejects_short_password(client, fraser_valley):
    response = client.post(
        "/api/v1/auth/signup",
        json=signup_payload(fraser_valley.id, password="short"),
    )
    assert response.status_code == 422


def test_signup_rejects_invalid_school(client):
    response = client.post("/api/v1/auth/signup", json=signup_payload(school_id=999999))
    assert response.status_code == 400


def test_signup_creates_unverified_account(client, db, fraser_valley):
    response = client.post("/api/v1/auth/signup", json=signup_payload(fraser_valley.id))
    assert response.status_code == 201
    assert response.json()["email"] == "newteacher@khalsaschool.ca"

    user = db.execute(
        select(models.User).where(models.User.email == "newteacher@khalsaschool.ca")
    ).scalar_one()
    assert user.email_verified is False
    assert user.role == "teacher"


def test_signup_rejects_duplicate_email(client, teacher_user, fraser_valley):
    response = client.post(
        "/api/v1/auth/signup",
        json=signup_payload(fraser_valley.id, email=teacher_user.email),
    )
    assert response.status_code == 409


def test_login_fails_for_unverified_account(client, db, fraser_valley):
    client.post("/api/v1/auth/signup", json=signup_payload(fraser_valley.id))
    response = client.post(
        "/api/v1/auth/login",
        json={"username": "newteacher@khalsaschool.ca", "password": "validpass123"},
    )
    assert response.status_code == 403


def test_login_succeeds_for_verified_account(client, teacher_user):
    response = client.post(
        "/api/v1/auth/login",
        json={"username": teacher_user.email, "password": "testpass123"},
    )
    assert response.status_code == 200
    assert "access_token" in response.json()


def test_login_rejects_wrong_password(client, teacher_user):
    response = client.post(
        "/api/v1/auth/login",
        json={"username": teacher_user.email, "password": "wrongpassword"},
    )
    assert response.status_code == 401


def test_verify_email_activates_account(client, db, fraser_valley):
    client.post("/api/v1/auth/signup", json=signup_payload(fraser_valley.id))
    user = db.execute(
        select(models.User).where(models.User.email == "newteacher@khalsaschool.ca")
    ).scalar_one()
    token = user.email_verify_token

    response = client.get(f"/api/v1/auth/verify-email?token={token}")
    assert response.status_code == 200

    db.refresh(user)
    assert user.email_verified is True
    assert user.email_verify_token is None


def test_verify_email_rejects_expired_token(client, db, fraser_valley):
    client.post("/api/v1/auth/signup", json=signup_payload(fraser_valley.id))
    user = db.execute(
        select(models.User).where(models.User.email == "newteacher@khalsaschool.ca")
    ).scalar_one()
    user.email_verify_token_expires = datetime.now(timezone.utc) - timedelta(hours=1)
    db.commit()

    response = client.get(f"/api/v1/auth/verify-email?token={user.email_verify_token}")
    assert response.status_code == 400


def test_verify_email_rejects_unknown_token(client):
    response = client.get("/api/v1/auth/verify-email?token=not-a-real-token")
    assert response.status_code == 400


def test_forgot_password_unknown_email_returns_404(client):
    response = client.post("/api/v1/auth/forgot-password", json={"email": "nobody@khalsaschool.ca"})
    assert response.status_code == 404


def test_forgot_and_reset_password_flow(client, db, teacher_user):
    response = client.post("/api/v1/auth/forgot-password", json={"email": teacher_user.email})
    assert response.status_code == 200

    db.refresh(teacher_user)
    token = teacher_user.password_reset_token
    assert token is not None

    reset_response = client.post(
        "/api/v1/auth/reset-password",
        json={"token": token, "new_password": "brandnewpassword123"},
    )
    assert reset_response.status_code == 200

    login_response = client.post(
        "/api/v1/auth/login",
        json={"username": teacher_user.email, "password": "brandnewpassword123"},
    )
    assert login_response.status_code == 200

    old_password_login = client.post(
        "/api/v1/auth/login",
        json={"username": teacher_user.email, "password": "testpass123"},
    )
    assert old_password_login.status_code == 401


def test_reset_password_rejects_expired_token(client, db, teacher_user):
    client.post("/api/v1/auth/forgot-password", json={"email": teacher_user.email})
    db.refresh(teacher_user)
    teacher_user.password_reset_token_expires = datetime.now(timezone.utc) - timedelta(hours=1)
    db.commit()

    response = client.post(
        "/api/v1/auth/reset-password",
        json={"token": teacher_user.password_reset_token, "new_password": "brandnewpassword123"},
    )
    assert response.status_code == 400


def test_me_returns_display_name_for_signed_up_account(client, teacher_headers, teacher_user):
    response = client.get("/api/v1/auth/me", headers=teacher_headers)
    assert response.status_code == 200
    body = response.json()
    assert body["display_name"] == f"{teacher_user.first_name} {teacher_user.last_name}"
    assert body["role"] == "teacher"


def test_me_requires_auth(client):
    response = client.get("/api/v1/auth/me")
    assert response.status_code in (401, 403)
