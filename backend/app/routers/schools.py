from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas

# Public (no auth) — the signup page needs this before the user has a token.
router = APIRouter(prefix="/api/v1/schools", tags=["schools"])


@router.get("", response_model=list[schemas.SchoolOut])
def list_schools(db: Session = Depends(get_db)):
    return db.execute(select(models.School).order_by(models.School.name)).scalars().all()
