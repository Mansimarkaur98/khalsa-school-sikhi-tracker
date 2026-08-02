from datetime import date, datetime
from typing import Optional

from sqlalchemy import ForeignKey, String, Text, Boolean, Date, DateTime, Integer, Index, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class School(Base):
    __tablename__ = "schools"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(200), unique=True, nullable=False)
    min_grade: Mapped[int] = mapped_column(Integer, nullable=False)
    max_grade: Mapped[int] = mapped_column(Integer, nullable=False)


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    first_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    last_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    role: Mapped[str] = mapped_column(String(20), nullable=False, default="teacher")
    school_id: Mapped[Optional[int]] = mapped_column(ForeignKey("sikhi_tracker.schools.id"), nullable=True)
    email_verified: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    email_verify_token: Mapped[Optional[str]] = mapped_column(String(64), unique=True, nullable=True)
    email_verify_token_expires: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    password_reset_token: Mapped[Optional[str]] = mapped_column(String(64), unique=True, nullable=True)
    password_reset_token_expires: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    school: Mapped[Optional["School"]] = relationship()


class Student(Base):
    __tablename__ = "students"
    __table_args__ = (
        Index("idx_students_active", "active_status", postgresql_where="active_status = true"),
        Index("idx_students_grade", "grade"),
    )

    student_id: Mapped[str] = mapped_column(String(10), primary_key=True)
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    school_id: Mapped[int] = mapped_column(ForeignKey("sikhi_tracker.schools.id"), nullable=False)
    grade: Mapped[str] = mapped_column(String(5), nullable=False)
    photo_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    active_status: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())
    created_by: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    updated_by: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    assessments: Mapped[list["Assessment"]] = relationship(back_populates="student")
    school: Mapped["School"] = relationship()


class Category(Base):
    __tablename__ = "categories"

    id: Mapped[int] = mapped_column(primary_key=True)
    category_name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    levels: Mapped[list["CategoryLevel"]] = relationship(back_populates="category")


class CategoryLevel(Base):
    __tablename__ = "category_levels"
    __table_args__ = (
        UniqueConstraint("category_id", "level_number", name="uq_category_level"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    category_id: Mapped[int] = mapped_column(ForeignKey("sikhi_tracker.categories.id"), nullable=False)
    level_number: Mapped[int] = mapped_column(Integer, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    category: Mapped["Category"] = relationship(back_populates="levels")


class Assessment(Base):
    __tablename__ = "assessments"

    id: Mapped[int] = mapped_column(primary_key=True)
    student_id: Mapped[str] = mapped_column(ForeignKey("sikhi_tracker.students.student_id"), nullable=False)
    category_id: Mapped[int] = mapped_column(ForeignKey("sikhi_tracker.categories.id"), nullable=False)
    level_id: Mapped[int] = mapped_column(ForeignKey("sikhi_tracker.category_levels.id"), nullable=False)
    assessment_date: Mapped[date] = mapped_column(Date, nullable=False)
    academic_year: Mapped[str] = mapped_column(String(9), nullable=False)
    assessment_term: Mapped[int] = mapped_column(Integer, nullable=False)
    assessed_by: Mapped[str] = mapped_column(String(100), nullable=False)
    comments: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    student: Mapped["Student"] = relationship(back_populates="assessments")
    category: Mapped["Category"] = relationship()
    level: Mapped["CategoryLevel"] = relationship()

    __table_args__ = (
        Index("idx_assessments_student_id", "student_id"),
        Index("idx_assessments_category_id", "category_id"),
        Index(
            "idx_assessments_student_category_date",
            "student_id", "category_id", assessment_date.desc(),
        ),
    )


class Goal(Base):
    """A target level + date a teacher sets for a student in a category.
    Append-only, same pattern as Assessment — never updated or deleted. The
    "current" goal for a student+category is simply the most recent row."""
    __tablename__ = "goals"

    id: Mapped[int] = mapped_column(primary_key=True)
    student_id: Mapped[str] = mapped_column(ForeignKey("sikhi_tracker.students.student_id"), nullable=False)
    category_id: Mapped[int] = mapped_column(ForeignKey("sikhi_tracker.categories.id"), nullable=False)
    target_level_id: Mapped[int] = mapped_column(ForeignKey("sikhi_tracker.category_levels.id"), nullable=False)
    target_date: Mapped[date] = mapped_column(Date, nullable=False)
    set_by: Mapped[str] = mapped_column(String(100), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    student: Mapped["Student"] = relationship()
    category: Mapped["Category"] = relationship()
    target_level: Mapped["CategoryLevel"] = relationship()

    __table_args__ = (
        Index("idx_goals_student_id", "student_id"),
        Index("idx_goals_category_id", "category_id"),
        Index(
            "idx_goals_student_category_created",
            "student_id", "category_id", created_at.desc(),
        ),
    )