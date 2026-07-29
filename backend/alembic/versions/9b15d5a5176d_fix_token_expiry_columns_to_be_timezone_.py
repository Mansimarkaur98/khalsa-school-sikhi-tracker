"""fix token expiry columns to be timezone-aware

Revision ID: 9b15d5a5176d
Revises: 17a05beaf2f4
Create Date: 2026-07-29 16:20:50.014759

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9b15d5a5176d'
down_revision: Union[str, Sequence[str], None] = '17a05beaf2f4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema.

    email_verify_token_expires / password_reset_token_expires were plain
    TIMESTAMP (no time zone). Writing tz-aware UTC datetimes into that column
    made psycopg2 silently convert them to the DB session's local time zone
    before storing, corrupting the value (e.g. a 1-hour-future token read
    back as already expired). Switching to TIMESTAMPTZ stores/returns the
    correct absolute instant regardless of session time zone.
    """
    op.alter_column(
        'users', 'email_verify_token_expires',
        type_=sa.DateTime(timezone=True),
        schema='sikhi_tracker',
    )
    op.alter_column(
        'users', 'password_reset_token_expires',
        type_=sa.DateTime(timezone=True),
        schema='sikhi_tracker',
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.alter_column(
        'users', 'password_reset_token_expires',
        type_=sa.DateTime(timezone=False),
        schema='sikhi_tracker',
    )
    op.alter_column(
        'users', 'email_verify_token_expires',
        type_=sa.DateTime(timezone=False),
        schema='sikhi_tracker',
    )
