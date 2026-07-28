from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app import models, schemas

router = APIRouter(prefix="/api/v1/categories", tags=["categories"], dependencies=[Depends(get_current_user)])


@router.get("", response_model=list[schemas.CategoryOut])
def list_categories(db: Session = Depends(get_db)):
    query = select(models.Category).where(models.Category.active.is_(True)).order_by(models.Category.id)
    return db.execute(query).scalars().all()


@router.get("/{category_id}/levels", response_model=list[schemas.LevelOut])
def list_levels(category_id: int, db: Session = Depends(get_db)):
    query = (
        select(models.CategoryLevel)
        .where(models.CategoryLevel.category_id == category_id, models.CategoryLevel.active.is_(True))
        .order_by(models.CategoryLevel.level_number)
    )
    return db.execute(query).scalars().all()
