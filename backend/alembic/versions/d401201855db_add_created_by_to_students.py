"""add created_by to students

Revision ID: d401201855db
Revises: 5989dafb437f
Create Date: 2026-07-30 13:47:28.135169

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd401201855db'
down_revision: Union[str, Sequence[str], None] = '5989dafb437f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('students', sa.Column('created_by', sa.String(length=255), nullable=True), schema='sikhi_tracker')


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('students', 'created_by', schema='sikhi_tracker')
