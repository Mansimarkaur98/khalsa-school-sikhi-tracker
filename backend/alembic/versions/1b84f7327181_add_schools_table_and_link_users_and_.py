"""add schools table and link users and students to it

Revision ID: 1b84f7327181
Revises: 9b15d5a5176d
Create Date: 2026-07-30 11:43:28.236766

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '1b84f7327181'
down_revision: Union[str, Sequence[str], None] = '9b15d5a5176d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


SCHEMA = "sikhi_tracker"
SCHOOL_NAMES = [
    "Khalsa School Newton",
    "Khalsa School Old Yale Road",
    "Khalsa School Fraser Valley",
    "Khalsa School Secondary",
]
DEFAULT_STUDENT_SCHOOL = "Khalsa School Fraser Valley"


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        "schools",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(length=200), nullable=False, unique=True),
        schema=SCHEMA,
    )

    schools_table = sa.table("schools", sa.column("name", sa.String), schema=SCHEMA)
    op.bulk_insert(schools_table, [{"name": name} for name in SCHOOL_NAMES])

    conn = op.get_bind()

    # users: add school_id (nullable, FK) + role, migrate the old free-text school
    # column into school_id, then drop the free-text column.
    op.add_column("users", sa.Column("school_id", sa.Integer(), nullable=True), schema=SCHEMA)
    op.create_foreign_key(
        "fk_users_school", "users", "schools", ["school_id"], ["id"],
        source_schema=SCHEMA, referent_schema=SCHEMA,
    )
    op.add_column(
        "users", sa.Column("role", sa.String(length=20), nullable=False, server_default="teacher"), schema=SCHEMA
    )
    conn.execute(sa.text(f"""
        UPDATE {SCHEMA}.users u
        SET school_id = s.id
        FROM {SCHEMA}.schools s
        WHERE u.school = s.name
    """))
    op.drop_column("users", "school", schema=SCHEMA)

    # students: add school_id (FK), backfill every existing student to the
    # agreed default school, then make it required.
    op.add_column("students", sa.Column("school_id", sa.Integer(), nullable=True), schema=SCHEMA)
    op.create_foreign_key(
        "fk_students_school", "students", "schools", ["school_id"], ["id"],
        source_schema=SCHEMA, referent_schema=SCHEMA,
    )
    conn.execute(sa.text(f"""
        UPDATE {SCHEMA}.students
        SET school_id = (SELECT id FROM {SCHEMA}.schools WHERE name = :name)
        WHERE school_id IS NULL
    """), {"name": DEFAULT_STUDENT_SCHOOL})
    op.alter_column("students", "school_id", nullable=False, schema=SCHEMA)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint("fk_students_school", "students", schema=SCHEMA, type_="foreignkey")
    op.drop_column("students", "school_id", schema=SCHEMA)

    op.add_column("users", sa.Column("school", sa.String(length=200), nullable=True), schema=SCHEMA)
    conn = op.get_bind()
    conn.execute(sa.text(f"""
        UPDATE {SCHEMA}.users u
        SET school = s.name
        FROM {SCHEMA}.schools s
        WHERE u.school_id = s.id
    """))
    op.drop_column("users", "role", schema=SCHEMA)
    op.drop_constraint("fk_users_school", "users", schema=SCHEMA, type_="foreignkey")
    op.drop_column("users", "school_id", schema=SCHEMA)

    op.drop_table("schools", schema=SCHEMA)
