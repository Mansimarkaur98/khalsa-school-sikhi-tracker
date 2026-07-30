"""add grade range to schools

Revision ID: 34925d66ff82
Revises: 1b84f7327181
Create Date: 2026-07-30 12:01:25.479575

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '34925d66ff82'
down_revision: Union[str, Sequence[str], None] = '1b84f7327181'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


SCHEMA = "sikhi_tracker"

GRADE_RANGES = {
    "Khalsa School Newton": (4, 7),
    "Khalsa School Old Yale Road": (4, 7),
    "Khalsa School Fraser Valley": (4, 12),
    "Khalsa School Secondary": (8, 12),
}


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column("schools", sa.Column("min_grade", sa.Integer(), nullable=True), schema=SCHEMA)
    op.add_column("schools", sa.Column("max_grade", sa.Integer(), nullable=True), schema=SCHEMA)

    conn = op.get_bind()
    for name, (min_grade, max_grade) in GRADE_RANGES.items():
        conn.execute(
            sa.text(f"UPDATE {SCHEMA}.schools SET min_grade = :min_grade, max_grade = :max_grade WHERE name = :name"),
            {"min_grade": min_grade, "max_grade": max_grade, "name": name},
        )

    op.alter_column("schools", "min_grade", nullable=False, schema=SCHEMA)
    op.alter_column("schools", "max_grade", nullable=False, schema=SCHEMA)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column("schools", "max_grade", schema=SCHEMA)
    op.drop_column("schools", "min_grade", schema=SCHEMA)
