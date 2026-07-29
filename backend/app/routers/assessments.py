from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app import models, schemas
from app.term_utils import compute_term_and_year, BlockedAssessmentDateError

router = APIRouter(prefix="/api/v1/students/{student_id}/assessments", tags=["assessments"],
                    dependencies=[Depends(get_current_user)])


@router.get("", response_model=list[schemas.AssessmentOut])
def list_assessments(student_id: str, db: Session = Depends(get_db)):
    student = db.get(models.Student, student_id)
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")

    query = (
        select(models.Assessment)
        .where(models.Assessment.student_id == student_id)
        .order_by(models.Assessment.assessment_date.desc())
    )
    return db.execute(query).scalars().all()


@router.post("", response_model=schemas.AssessmentOut, status_code=status.HTTP_201_CREATED)
def create_assessment(student_id: str, payload: schemas.AssessmentCreate, db: Session = Depends(get_db)):
    student = db.get(models.Student, student_id)
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")

    level = db.get(models.CategoryLevel, payload.level_id)
    if not level or level.category_id != payload.category_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="level_id does not belong to the given category_id",
        )

    try:
        term, academic_year = compute_term_and_year(payload.assessment_date)
    except BlockedAssessmentDateError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    assessment = models.Assessment(
        student_id=student_id,
        category_id=payload.category_id,
        level_id=payload.level_id,
        assessment_date=payload.assessment_date,
        academic_year=academic_year,
        assessment_term=term,
        assessed_by=payload.assessed_by,
        comments=payload.comments,
    )
    db.add(assessment)
    db.commit()
    db.refresh(assessment)
    return assessment


@router.put("/{assessment_id}", response_model=schemas.AssessmentOut)
def update_assessment(
    student_id: str, assessment_id: int, payload: schemas.AssessmentCreate, db: Session = Depends(get_db)
):
    assessment = db.get(models.Assessment, assessment_id)
    if not assessment or assessment.student_id != student_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assessment not found")

    level = db.get(models.CategoryLevel, payload.level_id)
    if not level or level.category_id != payload.category_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="level_id does not belong to the given category_id",
        )

    try:
        term, academic_year = compute_term_and_year(payload.assessment_date)
    except BlockedAssessmentDateError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    assessment.category_id = payload.category_id
    assessment.level_id = payload.level_id
    assessment.assessment_date = payload.assessment_date
    assessment.academic_year = academic_year
    assessment.assessment_term = term
    assessment.assessed_by = payload.assessed_by
    assessment.comments = payload.comments
    db.commit()
    db.refresh(assessment)
    return assessment


@router.delete("/{assessment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_assessment(student_id: str, assessment_id: int, db: Session = Depends(get_db)):
    assessment = db.get(models.Assessment, assessment_id)
    if not assessment or assessment.student_id != student_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assessment not found")
    db.delete(assessment)
    db.commit()
