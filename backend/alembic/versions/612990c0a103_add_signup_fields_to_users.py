"""add signup fields to users

Revision ID: 612990c0a103
Revises: 57b86da17527
Create Date: 2026-07-29 15:26:09.569567

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '612990c0a103'
down_revision: Union[str, Sequence[str], None] = '57b86da17527'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('users', sa.Column('first_name', sa.String(length=100), nullable=True), schema='sikhi_tracker')
    op.add_column('users', sa.Column('last_name', sa.String(length=100), nullable=True), schema='sikhi_tracker')
    op.add_column('users', sa.Column('school', sa.String(length=200), nullable=True), schema='sikhi_tracker')
    op.add_column('users', sa.Column('email', sa.String(length=255), nullable=True), schema='sikhi_tracker')
    op.create_unique_constraint('uq_users_email', 'users', ['email'], schema='sikhi_tracker')
    op.add_column('users', sa.Column('email_verified', sa.Boolean(), nullable=False, server_default=sa.false()), schema='sikhi_tracker')
    op.add_column('users', sa.Column('email_verify_token', sa.String(length=64), nullable=True), schema='sikhi_tracker')
    op.add_column('users', sa.Column('email_verify_token_expires', sa.DateTime(), nullable=True), schema='sikhi_tracker')
    op.create_unique_constraint('uq_users_email_verify_token', 'users', ['email_verify_token'], schema='sikhi_tracker')


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint('uq_users_email_verify_token', 'users', schema='sikhi_tracker', type_='unique')
    op.drop_column('users', 'email_verify_token_expires', schema='sikhi_tracker')
    op.drop_column('users', 'email_verify_token', schema='sikhi_tracker')
    op.drop_column('users', 'email_verified', schema='sikhi_tracker')
    op.drop_constraint('uq_users_email', 'users', schema='sikhi_tracker', type_='unique')
    op.drop_column('users', 'email', schema='sikhi_tracker')
    op.drop_column('users', 'school', schema='sikhi_tracker')
    op.drop_column('users', 'last_name', schema='sikhi_tracker')
    op.drop_column('users', 'first_name', schema='sikhi_tracker')
