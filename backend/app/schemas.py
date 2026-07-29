from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr, field_validator


# ---------- Auth ----------
class LoginRequest(BaseModel):
    username: str
    password: str


class SignupRequest(BaseModel):
    first_name: str
    last_name: str
    school: str
    email: EmailStr
    password: str

    @field_validator("password")
    @classmethod
    def password_min_length(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("password must be at least 8 characters")
        return v


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class SignupResponse(BaseModel):
    message: str
    email: EmailStr


class ResendVerificationRequest(BaseModel):
    email: EmailStr


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
    student_id: Optional[str] = None  # editable only while the student has no assessment history

    @field_validator("student_id")
    @classmethod
    def student_id_must_be_9_digits(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and not (v.isdigit() and len(v) == 9):
            raise ValueError("student_id must be exactly 9 digits")
        return v


class StudentOut(StudentBase):
    model_config = ConfigDict(from_attributes=True)

    student_id: str
    photo_url: Optional[str] = None
    active_status: bool
    created_at: datetime
    updated_at: datetime
    has_assessments: bool = False


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
