"""reorder students columns, add updated_by

Revision ID: 1850a9a1d587
Revises: 34925d66ff82
Create Date: 2026-07-30 13:44:37.733041

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '1850a9a1d587'
down_revision: Union[str, Sequence[str], None] = '34925d66ff82'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


SCHEMA = "sikhi_tracker"
GRANT_SQL = "GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON {}.students TO khalsa"


def upgrade() -> None:
    """Upgrade schema.

    Postgres has no in-place "reorder column" operation, so this recreates
    the students table with school_id moved next to student_id (instead of
    appended at the end, which is where ALTER TABLE ADD COLUMN always put it)
    and adds updated_by. Data, indexes, the FK to schools, the FK *from*
    assessments, and the khalsa role's grants are all rebuilt afterward.
    """
    op.drop_constraint("fk_assessment_student", "assessments", schema=SCHEMA, type_="foreignkey")

    op.execute(f"""
        CREATE TABLE {SCHEMA}.students_new (
            student_id VARCHAR(10) PRIMARY KEY,
            school_id INTEGER NOT NULL REFERENCES {SCHEMA}.schools(id),
            first_name VARCHAR(100) NOT NULL,
            last_name VARCHAR(100) NOT NULL,
            grade VARCHAR(5) NOT NULL,
            photo_url VARCHAR(500),
            active_status BOOLEAN NOT NULL DEFAULT true,
            created_at TIMESTAMP NOT NULL DEFAULT now(),
            updated_at TIMESTAMP NOT NULL DEFAULT now(),
            updated_by VARCHAR(255)
        )
    """)
    op.execute(f"""
        INSERT INTO {SCHEMA}.students_new
            (student_id, school_id, first_name, last_name, grade, photo_url, active_status, created_at, updated_at)
        SELECT student_id, school_id, first_name, last_name, grade, photo_url, active_status, created_at, updated_at
        FROM {SCHEMA}.students
    """)

    op.drop_table("students", schema=SCHEMA)
    op.rename_table("students_new", "students", schema=SCHEMA)

    op.execute(f"CREATE INDEX idx_students_active ON {SCHEMA}.students USING btree (active_status) WHERE (active_status = true)")
    op.execute(f"CREATE INDEX idx_students_grade ON {SCHEMA}.students USING btree (grade)")
    op.create_foreign_key(
        "fk_assessment_student", "assessments", "students", ["student_id"], ["student_id"],
        source_schema=SCHEMA, referent_schema=SCHEMA,
    )
    op.execute(GRANT_SQL.format(SCHEMA))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint("fk_assessment_student", "assessments", schema=SCHEMA, type_="foreignkey")

    op.execute(f"""
        CREATE TABLE {SCHEMA}.students_old (
            student_id VARCHAR(10) PRIMARY KEY,
            first_name VARCHAR(100) NOT NULL,
            last_name VARCHAR(100) NOT NULL,
            grade VARCHAR(5) NOT NULL,
            photo_url VARCHAR(500),
            active_status BOOLEAN NOT NULL DEFAULT true,
            created_at TIMESTAMP NOT NULL DEFAULT now(),
            updated_at TIMESTAMP NOT NULL DEFAULT now(),
            school_id INTEGER NOT NULL REFERENCES {SCHEMA}.schools(id)
        )
    """)
    op.execute(f"""
        INSERT INTO {SCHEMA}.students_old
            (student_id, first_name, last_name, grade, photo_url, active_status, created_at, updated_at, school_id)
        SELECT student_id, first_name, last_name, grade, photo_url, active_status, created_at, updated_at, school_id
        FROM {SCHEMA}.students
    """)

    op.drop_table("students", schema=SCHEMA)
    op.rename_table("students_old", "students", schema=SCHEMA)

    op.execute(f"CREATE INDEX idx_students_active ON {SCHEMA}.students USING btree (active_status) WHERE (active_status = true)")
    op.execute(f"CREATE INDEX idx_students_grade ON {SCHEMA}.students USING btree (grade)")
    op.create_foreign_key(
        "fk_assessment_student", "assessments", "students", ["student_id"], ["student_id"],
        source_schema=SCHEMA, referent_schema=SCHEMA,
    )
    op.execute(GRANT_SQL.format(SCHEMA))
