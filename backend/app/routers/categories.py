from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import get_current_user, get_current_user_context, require_admin, CurrentUserContext
from app.database import get_db
from app import models, schemas

router = APIRouter(prefix="/api/v1/categories", tags=["categories"], dependencies=[Depends(get_current_user)])


@router.get("", response_model=list[schemas.CategoryOut])
def list_categories(
    include_inactive: bool = False,
    db: Session = Depends(get_db),
    ctx: CurrentUserContext = Depends(get_current_user_context),
):
    query = select(models.Category).order_by(models.Category.id)
    if not (include_inactive and ctx.is_admin):
        query = query.where(models.Category.active.is_(True))
    return db.execute(query).scalars().all()


@router.post("", response_model=schemas.CategoryOut, status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_admin)])
def create_category(payload: schemas.CategoryCreate, db: Session = Depends(get_db)):
    existing = db.execute(
        select(models.Category).where(models.Category.category_name == payload.category_name)
    ).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="A category with this name already exists")

    category = models.Category(category_name=payload.category_name)
    db.add(category)
    db.commit()
    db.refresh(category)
    return category


@router.put("/{category_id}", response_model=schemas.CategoryOut, dependencies=[Depends(require_admin)])
def update_category(category_id: int, payload: schemas.CategoryUpdate, db: Session = Depends(get_db)):
    category = db.get(models.Category, category_id)
    if not category:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")

    existing = db.execute(
        select(models.Category).where(
            models.Category.category_name == payload.category_name, models.Category.id != category_id
        )
    ).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="A category with this name already exists")

    category.category_name = payload.category_name
    db.commit()
    db.refresh(category)
    return category


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(require_admin)])
def deactivate_category(category_id: int, db: Session = Depends(get_db)):
    category = db.get(models.Category, category_id)
    if not category:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")
    category.active = False
    db.commit()


@router.post("/{category_id}/restore", response_model=schemas.CategoryOut, dependencies=[Depends(require_admin)])
def restore_category(category_id: int, db: Session = Depends(get_db)):
    category = db.get(models.Category, category_id)
    if not category:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")
    category.active = True
    db.commit()
    db.refresh(category)
    return category


@router.get("/{category_id}/levels", response_model=list[schemas.LevelOut])
def list_levels(
    category_id: int,
    include_inactive: bool = False,
    db: Session = Depends(get_db),
    ctx: CurrentUserContext = Depends(get_current_user_context),
):
    query = select(models.CategoryLevel).where(models.CategoryLevel.category_id == category_id)
    if not (include_inactive and ctx.is_admin):
        query = query.where(models.CategoryLevel.active.is_(True))
    query = query.order_by(models.CategoryLevel.level_number)
    return db.execute(query).scalars().all()


@router.post(
    "/{category_id}/levels",
    response_model=schemas.LevelOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_admin)],
)
def create_level(category_id: int, payload: schemas.CategoryLevelCreate, db: Session = Depends(get_db)):
    category = db.get(models.Category, category_id)
    if not category:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")

    existing = db.execute(
        select(models.CategoryLevel).where(
            models.CategoryLevel.category_id == category_id,
            models.CategoryLevel.level_number == payload.level_number,
        )
    ).scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Level {payload.level_number} already exists for this category",
        )

    level = models.CategoryLevel(
        category_id=category_id, level_number=payload.level_number, description=payload.description
    )
    db.add(level)
    db.commit()
    db.refresh(level)
    return level


@router.put("/{category_id}/levels/{level_id}", response_model=schemas.LevelOut, dependencies=[Depends(require_admin)])
def update_level(
    category_id: int, level_id: int, payload: schemas.CategoryLevelUpdate, db: Session = Depends(get_db)
):
    level = db.get(models.CategoryLevel, level_id)
    if not level or level.category_id != category_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Level not found")

    existing = db.execute(
        select(models.CategoryLevel).where(
            models.CategoryLevel.category_id == category_id,
            models.CategoryLevel.level_number == payload.level_number,
            models.CategoryLevel.id != level_id,
        )
    ).scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Level {payload.level_number} already exists for this category",
        )

    level.level_number = payload.level_number
    level.description = payload.description
    db.commit()
    db.refresh(level)
    return level


@router.delete(
    "/{category_id}/levels/{level_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(require_admin)]
)
def deactivate_level(category_id: int, level_id: int, db: Session = Depends(get_db)):
    level = db.get(models.CategoryLevel, level_id)
    if not level or level.category_id != category_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Level not found")
    level.active = False
    db.commit()


@router.post(
    "/{category_id}/levels/{level_id}/restore", response_model=schemas.LevelOut, dependencies=[Depends(require_admin)]
)
def restore_level(category_id: int, level_id: int, db: Session = Depends(get_db)):
    level = db.get(models.CategoryLevel, level_id)
    if not level or level.category_id != category_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Level not found")
    level.active = True
    db.commit()
    db.refresh(level)
    return level
