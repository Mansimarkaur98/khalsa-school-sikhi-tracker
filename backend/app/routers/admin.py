from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.auth import CurrentUserContext, require_admin
from app.database import get_db
from app import models, schemas

router = APIRouter(prefix="/api/v1/admin", tags=["admin"], dependencies=[Depends(require_admin)])


def _to_admin_user_out(user: models.User) -> schemas.AdminUserOut:
    return schemas.AdminUserOut(
        id=user.id,
        first_name=user.first_name,
        last_name=user.last_name,
        email=user.email,
        role=user.role,
        email_verified=user.email_verified,
        school_id=user.school_id,
        school_name=user.school.name if user.school else None,
    )


@router.get("/users", response_model=list[schemas.AdminUserOut])
def list_users(db: Session = Depends(get_db)):
    users = db.execute(select(models.User).where(models.User.email.is_not(None)).order_by(models.User.first_name)).scalars().all()
    return [_to_admin_user_out(u) for u in users]


@router.put("/users/{user_id}/school", response_model=schemas.AdminUserOut)
def update_user_school(user_id: int, payload: schemas.AdminUserSchoolUpdate, db: Session = Depends(get_db)):
    user = db.get(models.User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    school = db.get(models.School, payload.school_id)
    if not school:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid school")

    user.school_id = payload.school_id
    db.commit()
    db.refresh(user)
    return _to_admin_user_out(user)


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(user_id: int, db: Session = Depends(get_db), ctx: CurrentUserContext = Depends(require_admin)):
    user = db.get(models.User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if user.email == ctx.identifier:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You cannot delete your own account")

    if user.role == "admin":
        admin_count = db.execute(
            select(func.count()).select_from(models.User).where(models.User.role == "admin")
        ).scalar_one()
        if admin_count <= 1:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot delete the last remaining admin")

    db.delete(user)
    db.commit()
