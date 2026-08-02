"""add goals table

Revision ID: 9a10c9265e86
Revises: df24390c0404
Create Date: 2026-08-01 20:41:36.192256

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9a10c9265e86'
down_revision: Union[str, Sequence[str], None] = 'df24390c0404'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

SCHEMA = "sikhi_tracker"
GRANT_SQL = "GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON {}.goals TO khalsa"


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'goals',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('student_id', sa.String(length=10), nullable=False),
        sa.Column('category_id', sa.Integer(), nullable=False),
        sa.Column('target_level_id', sa.Integer(), nullable=False),
        sa.Column('target_date', sa.Date(), nullable=False),
        sa.Column('set_by', sa.String(length=100), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['category_id'], ['sikhi_tracker.categories.id']),
        sa.ForeignKeyConstraint(['student_id'], ['sikhi_tracker.students.student_id']),
        sa.ForeignKeyConstraint(['target_level_id'], ['sikhi_tracker.category_levels.id']),
        sa.PrimaryKeyConstraint('id'),
        schema='sikhi_tracker',
    )
    op.create_index('idx_goals_category_id', 'goals', ['category_id'], unique=False, schema='sikhi_tracker')
    op.create_index(
        'idx_goals_student_category_created',
        'goals', ['student_id', 'category_id', sa.literal_column('created_at DESC')],
        unique=False, schema='sikhi_tracker',
    )
    op.create_index('idx_goals_student_id', 'goals', ['student_id'], unique=False, schema='sikhi_tracker')
    op.execute(GRANT_SQL.format(SCHEMA))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index('idx_goals_student_id', table_name='goals', schema='sikhi_tracker')
    op.drop_index('idx_goals_student_category_created', table_name='goals', schema='sikhi_tracker')
    op.drop_index('idx_goals_category_id', table_name='goals', schema='sikhi_tracker')
    op.drop_table('goals', schema='sikhi_tracker')
