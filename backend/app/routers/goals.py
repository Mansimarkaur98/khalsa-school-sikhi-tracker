from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import CurrentUserContext, get_current_user, get_current_user_context
from app.database import get_db
from app import models, schemas

router = APIRouter(prefix="/api/v1/students/{student_id}/goals", tags=["goals"],
                    dependencies=[Depends(get_current_user)])


def _get_student_for_access(db: Session, student_id: str, ctx: CurrentUserContext) -> models.Student:
    student = db.get(models.Student, student_id)
    if not student or (not ctx.is_admin and student.school_id != ctx.school_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")
    return student


@router.get("", response_model=list[schemas.GoalOut])
def list_goals(
    student_id: str,
    db: Session = Depends(get_db),
    ctx: CurrentUserContext = Depends(get_current_user_context),
):
    _get_student_for_access(db, student_id, ctx)

    query = (
        select(models.Goal)
        .where(models.Goal.student_id == student_id)
        .order_by(models.Goal.created_at.desc(), models.Goal.id.desc())
    )
    return db.execute(query).scalars().all()


@router.post("", response_model=schemas.GoalOut, status_code=status.HTTP_201_CREATED)
def create_goal(
    student_id: str,
    payload: schemas.GoalCreate,
    db: Session = Depends(get_db),
    ctx: CurrentUserContext = Depends(get_current_user_context),
):
    _get_student_for_access(db, student_id, ctx)

    target_level = db.get(models.CategoryLevel, payload.target_level_id)
    if not target_level or target_level.category_id != payload.category_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="target_level_id does not belong to the given category_id",
        )

    # "Current level" is the same definition used everywhere else in the app
    # (BR-3): the most recent assessment by date, tie-broken by id.
    most_recent_assessment = db.execute(
        select(models.Assessment)
        .where(models.Assessment.student_id == student_id, models.Assessment.category_id == payload.category_id)
        .order_by(models.Assessment.assessment_date.desc(), models.Assessment.id.desc())
        .limit(1)
    ).scalar_one_or_none()
    if not most_recent_assessment:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Record an assessment for this category before setting a target.",
        )

    current_level = db.get(models.CategoryLevel, most_recent_assessment.level_id)
    if target_level.level_number <= current_level.level_number:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Target level must be higher than the student's current level in this category.",
        )

    goal = models.Goal(
        student_id=student_id,
        category_id=payload.category_id,
        target_level_id=payload.target_level_id,
        target_date=payload.target_date,
        set_by=ctx.display_name,
    )
    db.add(goal)
    db.commit()
    db.refresh(goal)
    return goal
