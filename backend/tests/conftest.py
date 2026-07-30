r"""
Requires a dedicated `khalsa_school_test` Postgres database (same server/credentials
as your dev DB, via DATABASE_URL in .env, but a different database name so tests never
touch real data). One-time setup on a new machine:

    python -c "
import re, psycopg2
url = re.search(r'DATABASE_URL=(\S+)', open('.env').read()).group(1)
m = re.match(r'postgresql://([^:]+):([^@]+)@([^:/]+):?(\d+)?/(\w+)', url)
user, pw, host, port, _ = m.groups()
conn = psycopg2.connect(dbname='postgres', user=user, password=pw, host=host, port=int(port or 5432))
conn.autocommit = True
conn.cursor().execute('CREATE DATABASE khalsa_school_test')
conn = psycopg2.connect(dbname='khalsa_school_test', user=user, password=pw, host=host, port=int(port or 5432))
conn.autocommit = True
conn.cursor().execute('CREATE SCHEMA IF NOT EXISTS sikhi_tracker')
"

Tables/indexes are then created fresh each test session from the current models
(Base.metadata.create_all) — no Alembic history needed for a throwaway test DB.
"""

import re

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app import models
from app.auth import create_access_token, hash_password
from app.config import settings
from app.database import Base, get_db
from app.main import app


def _test_database_url() -> str:
    """Same connection as the dev DB, but a dedicated database so tests never
    touch real data."""
    return re.sub(r"/(\w+)$", "/khalsa_school_test", settings.database_url)


engine = create_engine(_test_database_url())
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="session", autouse=True)
def _create_schema():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture()
def db():
    """Each test runs inside a transaction that's rolled back afterwards, so
    route handlers can call db.commit() freely without leaking state between
    tests (SQLAlchemy's SAVEPOINT-based external-transaction test pattern)."""
    connection = engine.connect()
    outer_transaction = connection.begin()
    session = TestingSessionLocal(bind=connection, join_transaction_mode="create_savepoint")

    yield session

    session.close()
    outer_transaction.rollback()
    connection.close()


@pytest.fixture()
def client(db):
    def override_get_db():
        yield db

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture(autouse=True)
def _no_real_emails(monkeypatch):
    """Signup/forgot-password send real emails via SMTP — never let tests do that."""
    monkeypatch.setattr("app.routers.auth.send_activation_email", lambda *a, **k: None)
    monkeypatch.setattr("app.routers.auth.send_password_reset_email", lambda *a, **k: None)


# ---------- Data factories ----------

@pytest.fixture()
def fraser_valley(db):
    school = models.School(name="Khalsa School Fraser Valley", min_grade=4, max_grade=12)
    db.add(school)
    db.commit()
    db.refresh(school)
    return school


@pytest.fixture()
def newton(db):
    school = models.School(name="Khalsa School Newton", min_grade=4, max_grade=7)
    db.add(school)
    db.commit()
    db.refresh(school)
    return school


def make_user(db, email, role="teacher", school_id=None, first_name="Test", last_name="User"):
    user = models.User(
        email=email,
        password_hash=hash_password("testpass123"),
        first_name=first_name,
        last_name=last_name,
        role=role,
        school_id=school_id,
        email_verified=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture()
def admin_user(db, fraser_valley):
    return make_user(db, "admin.test@khalsaschool.ca", role="admin", school_id=fraser_valley.id, first_name="Admin")


@pytest.fixture()
def teacher_user(db, fraser_valley):
    return make_user(db, "teacher.test@khalsaschool.ca", role="teacher", school_id=fraser_valley.id, first_name="Teacher")


@pytest.fixture()
def other_school_teacher(db, newton):
    return make_user(db, "newton.teacher.test@khalsaschool.ca", role="teacher", school_id=newton.id, first_name="Newton")


def auth_headers(user) -> dict:
    token = create_access_token(user.email)
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture()
def admin_headers(admin_user):
    return auth_headers(admin_user)


@pytest.fixture()
def teacher_headers(teacher_user):
    return auth_headers(teacher_user)


@pytest.fixture()
def other_teacher_headers(other_school_teacher):
    return auth_headers(other_school_teacher)


@pytest.fixture()
def category(db):
    cat = models.Category(category_name="Test Category")
    db.add(cat)
    db.commit()
    db.refresh(cat)
    level = models.CategoryLevel(category_id=cat.id, level_number=1, description="Level 1")
    db.add(level)
    db.commit()
    db.refresh(level)
    return cat, level
