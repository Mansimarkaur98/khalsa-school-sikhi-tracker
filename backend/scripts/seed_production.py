"""
One-time bootstrap for a brand-new production database.

The Alembic migration history here assumes tables already exist (it predates
Alembic being introduced to this project), so `alembic upgrade head` alone
cannot build a schema from nothing. This script instead:

  1. Creates the `sikhi_tracker` schema if missing.
  2. Builds every table from the current SQLAlchemy models (the final shape,
     no need to replay migration history).
  3. Stamps Alembic's version table at `head`, so future `alembic upgrade
     head` runs (for migrations added after this point) apply cleanly.
  4. Seeds the schools and assessment categories/levels — required reference
     data the app can't function without.
  5. Creates one admin account, if ADMIN_EMAIL/ADMIN_PASSWORD are set.

Safe to run more than once — every step checks for existing data first.

Usage (run once, against the production DATABASE_URL):
    ADMIN_EMAIL=you@khalsaschool.ca ADMIN_PASSWORD=... ADMIN_FIRST_NAME=Jane ADMIN_LAST_NAME=Doe \
        python scripts/seed_production.py
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from alembic import command
from alembic.config import Config
from sqlalchemy import text, select

from app import models
from app.auth import hash_password
from app.database import Base, SessionLocal, engine

SCHOOLS = [
    {"name": "Khalsa School Newton", "min_grade": 4, "max_grade": 7},
    {"name": "Khalsa School Old Yale Road", "min_grade": 4, "max_grade": 7},
    {"name": "Khalsa School Fraser Valley", "min_grade": 4, "max_grade": 12},
    {"name": "Khalsa School Secondary", "min_grade": 8, "max_grade": 12},
]

CATEGORIES = [
    "Gurbani Reading",
    "Kirtan",
    "Tabla",
    "Gatka",
    "Nitnem Gurbani Kanth",
    "Daily Paath Recitation",
    "Daily Simran Recitation",
    "Amrit Status & Intention",
]

LEVELS_BY_CATEGORY = {
    "Gurbani Reading": [
        "Still learning the Gurmukhi letters (ੳ–ੜ)",
        "Recognizes all Gurmukhi letters but is still learning lagaan/matraan",
        "Can read simple mukta words",
        "Can join and read some words with lagaan/matraan",
        "Can join and read most Punjabi words",
        "Can read most Punjabi sentences",
        "Can read paragraphs in Punjabi",
        "Can fluently read age-appropriate Punjabi stories",
        "Can read from Sri Guru Granth Sahib Ji in Pad Chhed form in a proficient manner (20+ angs per hour)",
        "Can read from Sri Guru Granth Sahib Ji in Larivaar form in a proficient manner (20+ angs per hour)",
    ],
    "Kirtan": [
        "Has not yet begun learning Kirtan",
        "Can participate in group Kirtan by repeating simple lines",
        "Can sing a simple shabad with support from a teacher or group",
        "Can independently sing a complete shabad in a simple tune",
        "Can sing a complete shabad while maintaining sur and a basic taal",
        "Can sing several shabads confidently",
        "Can independently lead Kirtan and coordinate with tabla",
        "Can sing shabads in prescribed or traditional raags with developing proficiency",
        "Can perform several shabads in raag with strong sur, taal and Gurbani pronunciation",
        "Can independently lead Kirtan in a blissful manner for Sangat",
    ],
    "Tabla": [
        "Has not yet begun learning tabla",
        "Can identify the dayan and bayan and demonstrate basic hand positions",
        "Can play basic bols with support",
        "Can play a simple theka slowly while maintaining a steady beat",
        "Can play basic taals, such as Keharwa or Dadra, with developing consistency",
        "Can accompany a simple shabad while maintaining taal",
        "Can accompany several styles and tempos of Kirtan confidently",
        "Can play multiple taals and use appropriate variations, fills and tihai",
        "Can sensitively accompany advanced Kirtan, including changing tempos and raag-based compositions",
        "Can independently accompany a full Kirtan program with strong taal, technique and musical judgment",
    ],
    "Gatka": [
        "Has not yet begun learning Gatka",
        "Understands basic safety expectations, discipline and respectful handling of shastar",
        "Can demonstrate basic stances, footwork and simple movements",
        "Can perform foundational movements with teacher support",
        "Can independently perform basic movements and simple combinations with control",
        "Can demonstrate coordinated footwork, defence and attack combinations",
        "Can demonstrate proficiency with multiple Gatka shastar",
        "Can perform advanced sequences and controlled demonstrations",
        "Can perform in advanced manner in both shaster spinning as well as fari soti fight",
        "Can reliably and consistently perform at a very high level in external gatka competitions against peers",
    ],
    "Nitnem Gurbani Kanth": [
        "Less than 5 Pauris of Japji Sahib",
        "5-10 Pauris of Japji Sahib",
        "11-20 Pauris of Japji Sahib",
        "Majority of Japji Sahib but not complete",
        "Japji Sahib Complete",
        "Japji Sahib & Chaupai Sahib complete",
        "Majority of Nitnem Banis complete",
        "Full Nitnem completed",
        "Nitnem + Asa Di Vaar complete",
        "Nitnem + Sukhmani Sahib complete",
    ],
    "Daily Paath Recitation": [
        "Paath is not currently completed daily on a consistent basis",
        "Recites Mool Mantar or another portion of Gurbani daily for approximately 5–10 minutes",
        "Recites one shorter bani, such as Chaupai Sahib, daily",
        "Recites Japji Sahib daily",
        "Recites Japji Sahib and Rehraas Sahib daily",
        "Recites Japji Sahib and multiple additional banis daily",
        "Completes full Nitnem most days but not every day",
        "Completes full Nitnem daily",
        "Completes full Nitnem and some additional Gurbani daily",
        "Completes full Nitnem + Asa Di Vaar and/or Sukhmani Sahib daily",
    ],
    "Daily Simran Recitation": [
        "Simran is not currently practised daily",
        "Simran is practiced sometimes but not regularly",
        "Approximately 5 minutes daily",
        "Approximately 10 minutes daily",
        "Approximately 15 minutes daily",
        "Approximately 20 minutes daily",
        "Approximately 30 minutes daily",
        "Approximately 45 minutes daily",
        "Approximately 60 minutes daily",
        "More than 60 minutes daily",
    ],
    "Amrit Status & Intention": [
        "Prefers not to disclose",
        "Does not currently intend to take Amrit",
        "Has not yet thought about taking Amrit",
        "Unsure or still considering",
        "Hopes to take Amrit in the future but has no anticipated timeframe",
        "Intends to take Amrit within the next few years",
        "Intends to take Amrit within the next year",
        "Intends to take Amrit soon and knows which Amrit Sanchaar",
        "Amritdhari",
        "Amritdhari and doing Nitnem daily",
    ],
}


def bootstrap_schema():
    with engine.connect() as conn:
        conn.execute(text("CREATE SCHEMA IF NOT EXISTS sikhi_tracker"))
        conn.commit()
    Base.metadata.create_all(bind=engine)
    print("Schema + tables ready.")

    alembic_cfg = Config(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "alembic.ini"))
    command.stamp(alembic_cfg, "head")
    print("Alembic stamped at head.")


def seed_schools(db):
    existing = {s.name for s in db.execute(select(models.School)).scalars().all()}
    for school in SCHOOLS:
        if school["name"] in existing:
            continue
        db.add(models.School(**school))
    db.commit()
    print(f"Schools seeded ({len(SCHOOLS)} total).")


def seed_categories_and_levels(db):
    existing_categories = {c.category_name: c for c in db.execute(select(models.Category)).scalars().all()}
    for name in CATEGORIES:
        if name in existing_categories:
            continue
        cat = models.Category(category_name=name)
        db.add(cat)
        db.flush()
        existing_categories[name] = cat
    db.commit()

    for name, descriptions in LEVELS_BY_CATEGORY.items():
        cat = existing_categories[name]
        existing_levels = {
            lvl.level_number
            for lvl in db.execute(
                select(models.CategoryLevel).where(models.CategoryLevel.category_id == cat.id)
            ).scalars()
        }
        for i, description in enumerate(descriptions, start=1):
            if i in existing_levels:
                continue
            db.add(models.CategoryLevel(category_id=cat.id, level_number=i, description=description))
    db.commit()
    print(f"Categories + levels seeded ({len(CATEGORIES)} categories).")


def seed_admin(db):
    email = os.environ.get("ADMIN_EMAIL")
    password = os.environ.get("ADMIN_PASSWORD")
    if not email or not password:
        print("ADMIN_EMAIL/ADMIN_PASSWORD not set — skipping admin account creation.")
        return

    existing = db.execute(select(models.User).where(models.User.email == email)).scalar_one_or_none()
    if existing:
        print(f"Admin account {email} already exists — skipping.")
        return

    db.add(
        models.User(
            email=email,
            password_hash=hash_password(password),
            first_name=os.environ.get("ADMIN_FIRST_NAME", "Admin"),
            last_name=os.environ.get("ADMIN_LAST_NAME", "User"),
            role="admin",
            email_verified=True,
        )
    )
    db.commit()
    print(f"Admin account created: {email}")


def main():
    bootstrap_schema()
    db = SessionLocal()
    try:
        seed_schools(db)
        seed_categories_and_levels(db)
        seed_admin(db)
    finally:
        db.close()
    print("Done.")


if __name__ == "__main__":
    main()
