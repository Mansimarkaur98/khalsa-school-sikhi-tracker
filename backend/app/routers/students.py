from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import CurrentUserContext, get_current_user, get_current_user_context
from app.database import get_db
from app import models, schemas
from app.cloudinary_utils import (
    upload_student_photo,
    delete_student_photo,
    MAX_PHOTO_SIZE_BYTES,
    ALLOWED_CONTENT_TYPES,
)

router = APIRouter(prefix="/api/v1/students", tags=["students"], dependencies=[Depends(get_current_user)])


def _has_assessments(db: Session, student_id: str) -> bool:
    return (
        db.execute(select(models.Assessment.id).where(models.Assessment.student_id == student_id).limit(1)).first()
        is not None
    )


def _check_grade_in_school_range(grade: str, school: models.School) -> None:
    if not grade.isdigit() or not (school.min_grade <= int(grade) <= school.max_grade):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"{school.name} only serves grades {school.min_grade}-{school.max_grade}.",
        )


def _to_student_out(student: models.Student, db: Session) -> schemas.StudentOut:
    result = schemas.StudentOut.model_validate(student)
    result.has_assessments = _has_assessments(db, student.student_id)
    result.school_name = student.school.name if student.school else None
    return result


def _get_student_for_access(db: Session, student_id: str, ctx: CurrentUserContext) -> models.Student:
    """Fetches a student, enforcing school-scoping. Raises 404 (not just for
    non-existence, but also for a real student outside the caller's school) so
    non-admins can't tell the difference between "doesn't exist" and "not yours"."""
    student = db.get(models.Student, student_id)
    if not student or (not ctx.is_admin and student.school_id != ctx.school_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")
    return student


@router.get("", response_model=list[schemas.StudentListItem])
def list_students(
    student_id: Optional[str] = None,
    first_name: Optional[str] = None,
    last_name: Optional[str] = None,
    grade: Optional[str] = None,
    school_id: Optional[int] = None,
    include_inactive: bool = False,
    db: Session = Depends(get_db),
    ctx: CurrentUserContext = Depends(get_current_user_context),
):
    if not ctx.is_admin and ctx.school_id is None:
        return []

    query = select(models.Student)
    if not ctx.is_admin:
        query = query.where(models.Student.school_id == ctx.school_id)
    elif school_id is not None:
        # Admins may optionally narrow down to one school; unset means "all schools".
        query = query.where(models.Student.school_id == school_id)
    if not include_inactive:
        query = query.where(models.Student.active_status.is_(True))
    if student_id:
        query = query.where(models.Student.student_id.ilike(f"%{student_id}%"))
    if first_name:
        query = query.where(models.Student.first_name.ilike(f"%{first_name}%"))
    if last_name:
        query = query.where(models.Student.last_name.ilike(f"%{last_name}%"))
    if grade:
        query = query.where(models.Student.grade == grade)

    students = db.execute(query.order_by(models.Student.first_name, models.Student.last_name)).scalars().all()
    results = []
    for s in students:
        item = schemas.StudentListItem.model_validate(s)
        item.school_name = s.school.name if s.school else None
        results.append(item)
    return results


@router.post("", response_model=schemas.StudentOut, status_code=status.HTTP_201_CREATED)
def create_student(
    payload: schemas.StudentCreate,
    db: Session = Depends(get_db),
    ctx: CurrentUserContext = Depends(get_current_user_context),
):
    if ctx.is_admin:
        if not payload.school_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="school_id is required")
        school_id = payload.school_id
    else:
        if ctx.school_id is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Your account has no school assigned"
            )
        school_id = ctx.school_id

    school = db.get(models.School, school_id)
    if not school:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid school")
    _check_grade_in_school_range(payload.grade, school)

    existing = db.get(models.Student, payload.student_id)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "message": f"Student ID {payload.student_id} is already in use.",
                "conflicting_student": {
                    "student_id": existing.student_id,
                    "first_name": existing.first_name,
                    "last_name": existing.last_name,
                    "grade": existing.grade,
                },
            },
        )
    student = models.Student(**{
        **payload.model_dump(exclude={"school_id"}),
        "school_id": school_id,
        "created_by": ctx.identifier,
        "updated_by": ctx.identifier,
    })
    db.add(student)
    db.commit()
    db.refresh(student)
    return _to_student_out(student, db)


@router.get("/{student_id}", response_model=schemas.StudentOut)
def get_student(
    student_id: str,
    db: Session = Depends(get_db),
    ctx: CurrentUserContext = Depends(get_current_user_context),
):
    student = _get_student_for_access(db, student_id, ctx)
    return _to_student_out(student, db)


@router.put("/{student_id}", response_model=schemas.StudentOut)
def update_student(
    student_id: str,
    payload: schemas.StudentUpdate,
    db: Session = Depends(get_db),
    ctx: CurrentUserContext = Depends(get_current_user_context),
):
    student = _get_student_for_access(db, student_id, ctx)

    target_school = student.school
    if payload.school_id and payload.school_id != student.school_id:
        if not ctx.is_admin:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="Only an admin can change a student's school"
            )
        new_school = db.get(models.School, payload.school_id)
        if not new_school:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid school")
        target_school = new_school

    _check_grade_in_school_range(payload.grade, target_school)

    if payload.student_id and payload.student_id != student_id:
        if _has_assessments(db, student_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This student has assessment history, so their Student ID cannot be changed.",
            )
        existing = db.get(models.Student, payload.student_id)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={
                    "message": f"Student ID {payload.student_id} is already in use.",
                    "conflicting_student": {
                        "student_id": existing.student_id,
                        "first_name": existing.first_name,
                        "last_name": existing.last_name,
                        "grade": existing.grade,
                    },
                },
            )
        student.student_id = payload.student_id

    for field, value in payload.model_dump(exclude={"student_id", "school_id"}).items():
        setattr(student, field, value)
    if payload.school_id:
        student.school_id = payload.school_id
    student.updated_by = ctx.identifier
    db.commit()
    db.refresh(student)
    return _to_student_out(student, db)


@router.post("/{student_id}/photo", response_model=schemas.StudentOut)
async def upload_photo(
    student_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    ctx: CurrentUserContext = Depends(get_current_user_context),
):
    student = _get_student_for_access(db, student_id, ctx)

    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Photo must be JPG or PNG.",
        )

    file_bytes = await file.read()
    if len(file_bytes) > MAX_PHOTO_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Photo must be 5MB or smaller.",
        )

    student.photo_url = upload_student_photo(file_bytes, student_id)
    db.commit()
    db.refresh(student)
    return _to_student_out(student, db)


@router.delete("/{student_id}/photo", response_model=schemas.StudentOut)
def remove_photo(
    student_id: str,
    db: Session = Depends(get_db),
    ctx: CurrentUserContext = Depends(get_current_user_context),
):
    student = _get_student_for_access(db, student_id, ctx)

    if student.photo_url:
        delete_student_photo(student_id)
        student.photo_url = None
        db.commit()
        db.refresh(student)
    return _to_student_out(student, db)


@router.delete("/{student_id}", status_code=status.HTTP_204_NO_CONTENT)
def archive_student(
    student_id: str,
    db: Session = Depends(get_db),
    ctx: CurrentUserContext = Depends(get_current_user_context),
):
    """Archives (deactivates) a student rather than hard-deleting — preserves
    assessment history per BR, and keeps the student_id from being reused."""
    student = _get_student_for_access(db, student_id, ctx)
    student.active_status = False
    db.commit()


@router.post("/{student_id}/restore", response_model=schemas.StudentOut)
def restore_student(
    student_id: str,
    db: Session = Depends(get_db),
    ctx: CurrentUserContext = Depends(get_current_user_context),
):
    student = _get_student_for_access(db, student_id, ctx)
    student.active_status = True
    db.commit()
    db.refresh(student)
    return _to_student_out(student, db)


@router.delete("/{student_id}/permanent", status_code=status.HTTP_204_NO_CONTENT)
def permanently_delete_student(
    student_id: str,
    db: Session = Depends(get_db),
    ctx: CurrentUserContext = Depends(get_current_user_context),
):
    """Hard-deletes a student. Only allowed once archived, and only if they
    have zero assessment history — otherwise archiving is the end state, by
    design, so that assessment records are never silently lost. Admin-only."""
    if not ctx.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only an admin can permanently delete a student")

    student = _get_student_for_access(db, student_id, ctx)
    if student.active_status:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Archive this student before permanently deleting them.",
        )
    has_assessments = db.execute(
        select(models.Assessment.id).where(models.Assessment.student_id == student_id).limit(1)
    ).first()
    if has_assessments:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This student has assessment history and cannot be permanently deleted.",
        )
    if student.photo_url:
        delete_student_photo(student_id)
    db.delete(student)
    db.commit()
