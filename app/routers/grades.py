from fastapi import APIRouter, Depends
from sqlalchemy import select, func
from sqlalchemy.orm import Session, aliased

from app.auth import get_current_user
from app.database import get_db
from app import models, schemas

router = APIRouter(prefix="/api/v1/grades", tags=["grades"], dependencies=[Depends(get_current_user)])


@router.get("/{grade}/progress", response_model=list[schemas.GradeProgressItem])
def grade_progress(grade: str, db: Session = Depends(get_db)):
    """
    For every active student in `grade`, find each student's most recent
    assessment per category (BR-3: current progress = latest by date), then
    average that level across all students in the grade, per category.

    Every active category is always included in the result, even if no
    student in this grade has an assessment in it yet (average_level will
    be null and student_count will be 0 in that case) — so the frontend
    doesn't need to guess why a category is missing from the response.
    """
    A = aliased(models.Assessment)

    # Step 1: rank each student's assessments per category, newest first.
    # row_number = 1 means "this is that student's current level in this category."
    ranked = (
        select(
            A.student_id,
            A.category_id,
            A.level_id,
            func.row_number()
            .over(
                partition_by=(A.student_id, A.category_id),
                order_by=(A.assessment_date.desc(), A.id.desc()),
            )
            .label("rn"),
        )
        .join(models.Student, models.Student.student_id == A.student_id)
        .where(models.Student.grade == grade, models.Student.active_status.is_(True))
        .subquery()
    )

    # Step 2: each student's current (rn = 1) level, joined to get level_number.
    current_levels = (
        select(
            ranked.c.category_id,
            models.CategoryLevel.level_number,
        )
        .select_from(ranked)
        .join(models.CategoryLevel, models.CategoryLevel.id == ranked.c.level_id)
        .where(ranked.c.rn == 1)
        .subquery()
    )

    # Step 3: max level per category (for the "avg / max" display on the frontend).
    max_levels = (
        select(
            models.CategoryLevel.category_id,
            func.max(models.CategoryLevel.level_number).label("max_level"),
        )
        .where(models.CategoryLevel.active.is_(True))
        .group_by(models.CategoryLevel.category_id)
        .subquery()
    )

    # Step 4: LEFT JOIN from every active category — so categories with zero
    # assessments in this grade still appear, instead of silently disappearing.
    query = (
        select(
            models.Category.id.label("category_id"),
            models.Category.category_name.label("category_name"),
            func.avg(current_levels.c.level_number).label("average_level"),
            func.count(current_levels.c.level_number).label("student_count"),
            max_levels.c.max_level,
        )
        .select_from(models.Category)
        .outerjoin(current_levels, current_levels.c.category_id == models.Category.id)
        .join(max_levels, max_levels.c.category_id == models.Category.id)
        .where(models.Category.active.is_(True))
        .group_by(models.Category.id, models.Category.category_name, max_levels.c.max_level)
        .order_by(models.Category.id)
    )

    rows = db.execute(query).all()
    return [
        schemas.GradeProgressItem(
            category_id=r.category_id,
            category_name=r.category_name,
            average_level=round(float(r.average_level), 1) if r.average_level is not None else None,
            max_level=r.max_level,
            student_count=r.student_count,
        )
        for r in rows
    ]
