from sqlalchemy import create_engine, MetaData
from sqlalchemy.orm import sessionmaker, DeclarativeBase

from app.config import settings

engine = create_engine(settings.database_url, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# All tables live in the sikhi_tracker schema, not public — set that as the default
# so every model below doesn't need to repeat schema="sikhi_tracker" individually.
metadata = MetaData(schema="sikhi_tracker")


class Base(DeclarativeBase):
    metadata = metadata


def get_db():
    """FastAPI dependency — yields a session per request, always closes it after."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
