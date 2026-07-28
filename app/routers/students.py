from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app import models, schemas
from app.cloudinary_utils import upload_student_photo, MAX_PHOTO_SIZE_BYTES, ALLOWED_CONTENT_TYPES

router = APIRouter(prefix="/api/v1/students", tags=["students"], dependencies=[Depends(get_current_user)])


@router.get("", response_model=list[schemas.StudentListItem])
def list_students(
    student_id: Optional[str] = None,
    first_name: Optional[str] = None,
    last_name: Optional[str] = None,
    grade: Optional[str] = None,
    include_inactive: bool = False,
    db: Session = Depends(get_db),
):
    query = select(models.Student)
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

    return db.execute(query.order_by(models.Student.last_name)).scalars().all()


@router.post("", response_model=schemas.StudentOut, status_code=status.HTTP_201_CREATED)
def create_student(payload: schemas.StudentCreate, db: Session = Depends(get_db)):
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
    student = models.Student(**payload.model_dump())
    db.add(student)
    db.commit()
    db.refresh(student)
    return student


@router.get("/{student_id}", response_model=schemas.StudentOut)
def get_student(student_id: str, db: Session = Depends(get_db)):
    student = db.get(models.Student, student_id)
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")
    return student


@router.put("/{student_id}", response_model=schemas.StudentOut)
def update_student(student_id: str, payload: schemas.StudentUpdate, db: Session = Depends(get_db)):
    student = db.get(models.Student, student_id)
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")
    for field, value in payload.model_dump().items():
        setattr(student, field, value)
    db.commit()
    db.refresh(student)
    return student


@router.post("/{student_id}/photo", response_model=schemas.StudentOut)
async def upload_photo(student_id: str, file: UploadFile = File(...), db: Session = Depends(get_db)):
    student = db.get(models.Student, student_id)
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")

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
    return student
