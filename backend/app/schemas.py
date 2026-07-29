from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, field_validator


# ---------- Auth ----------
class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


# ---------- Students ----------
class StudentBase(BaseModel):
    first_name: str
    last_name: str
    grade: str

    @field_validator("grade")
    @classmethod
    def grade_must_be_valid(cls, v: str) -> str:
        valid_grades = {"K"} | {str(i) for i in range(1, 13)}
        if v not in valid_grades:
            raise ValueError(f"grade must be one of: {sorted(valid_grades)}")
        return v


class StudentCreate(StudentBase):
    student_id: str

    @field_validator("student_id")
    @classmethod
    def student_id_must_be_9_digits(cls, v: str) -> str:
        if not (v.isdigit() and len(v) == 9):
            raise ValueError("student_id must be exactly 9 digits")
        return v


class StudentUpdate(StudentBase):
    pass  # student_id is deliberately excluded — immutable per FR-2


class StudentOut(StudentBase):
    model_config = ConfigDict(from_attributes=True)

    student_id: str
    photo_url: Optional[str] = None
    active_status: bool
    created_at: datetime
    updated_at: datetime


class StudentListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    student_id: str
    first_name: str
    last_name: str
    grade: str
    photo_url: Optional[str] = None
    active_status: bool


# ---------- Categories & Levels ----------
class CategoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    category_name: str


class LevelOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    category_id: int
    level_number: int
    description: str


# ---------- Assessments ----------
class AssessmentCreate(BaseModel):
    category_id: int
    level_id: int
    assessment_date: date
    assessed_by: str
    comments: Optional[str] = None


class AssessmentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    student_id: str
    category_id: int
    level_id: int
    assessment_date: date
    academic_year: str
    assessment_term: int
    assessed_by: str
    comments: Optional[str] = None


# ---------- Grade Progress ----------
class GradeProgressItem(BaseModel):
    category_id: int
    category_name: str
    average_level: Optional[float] = None
    max_level: int
    student_count: int
