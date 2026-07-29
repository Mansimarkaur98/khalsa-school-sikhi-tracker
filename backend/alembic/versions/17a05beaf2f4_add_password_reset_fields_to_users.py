"""add password reset fields to users

Revision ID: 17a05beaf2f4
Revises: 612990c0a103
Create Date: 2026-07-29 16:14:22.277437

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '17a05beaf2f4'
down_revision: Union[str, Sequence[str], None] = '612990c0a103'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('users', sa.Column('password_reset_token', sa.String(length=64), nullable=True), schema='sikhi_tracker')
    op.add_column('users', sa.Column('password_reset_token_expires', sa.DateTime(), nullable=True), schema='sikhi_tracker')
    op.create_unique_constraint('uq_users_password_reset_token', 'users', ['password_reset_token'], schema='sikhi_tracker')


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint('uq_users_password_reset_token', 'users', schema='sikhi_tracker', type_='unique')
    op.drop_column('users', 'password_reset_token_expires', schema='sikhi_tracker')
    op.drop_column('users', 'password_reset_token', schema='sikhi_tracker')
