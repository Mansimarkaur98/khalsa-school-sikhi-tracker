"""drop redundant username column, reorder users columns

Revision ID: 5989dafb437f
Revises: 1850a9a1d587
Create Date: 2026-07-30 13:45:28.446015

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '5989dafb437f'
down_revision: Union[str, Sequence[str], None] = '1850a9a1d587'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


SCHEMA = "sikhi_tracker"
GRANT_SQL = "GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON {}.users TO khalsa"


def upgrade() -> None:
    """Upgrade schema.

    Drops the username column (it was always set equal to email for every
    real account — the shared staff login is env-configured and never reads
    this table) and reorders the remaining columns into a more sensible
    layout. Recreated the same way as the students table, since Postgres
    can't reorder or drop-with-reorder in place.

    Also removes the one legacy row with no email (id=1, a leftover from
    before signup existed) — with username gone it would be an unreachable,
    unidentifiable row; it was never read by any login path.
    """
    op.execute(f"DELETE FROM {SCHEMA}.users WHERE email IS NULL")

    op.execute(f"""
        CREATE TABLE {SCHEMA}.users_new (
            id SERIAL PRIMARY KEY,
            email VARCHAR(255) NOT NULL UNIQUE,
            password_hash VARCHAR(255) NOT NULL,
            first_name VARCHAR(100),
            last_name VARCHAR(100),
            role VARCHAR(20) NOT NULL DEFAULT 'teacher',
            school_id INTEGER REFERENCES {SCHEMA}.schools(id),
            email_verified BOOLEAN NOT NULL DEFAULT false,
            email_verify_token VARCHAR(64) UNIQUE,
            email_verify_token_expires TIMESTAMPTZ,
            password_reset_token VARCHAR(64) UNIQUE,
            password_reset_token_expires TIMESTAMPTZ
        )
    """)
    op.execute(f"""
        INSERT INTO {SCHEMA}.users_new
            (id, email, password_hash, first_name, last_name, role, school_id,
             email_verified, email_verify_token, email_verify_token_expires,
             password_reset_token, password_reset_token_expires)
        SELECT id, email, password_hash, first_name, last_name, role, school_id,
               email_verified, email_verify_token, email_verify_token_expires,
               password_reset_token, password_reset_token_expires
        FROM {SCHEMA}.users
    """)
    op.execute(f"SELECT setval(pg_get_serial_sequence('{SCHEMA}.users_new', 'id'), (SELECT COALESCE(MAX(id), 1) FROM {SCHEMA}.users_new))")

    op.drop_table("users", schema=SCHEMA)
    op.rename_table("users_new", "users", schema=SCHEMA)
    op.execute(GRANT_SQL.format(SCHEMA))


def downgrade() -> None:
    """Downgrade schema."""
    op.execute(f"""
        CREATE TABLE {SCHEMA}.users_old (
            id SERIAL PRIMARY KEY,
            username VARCHAR(50) NOT NULL UNIQUE,
            password_hash VARCHAR(255) NOT NULL,
            first_name VARCHAR(100),
            last_name VARCHAR(100),
            school_id INTEGER REFERENCES {SCHEMA}.schools(id),
            email VARCHAR(255) UNIQUE,
            email_verified BOOLEAN NOT NULL DEFAULT false,
            email_verify_token VARCHAR(64) UNIQUE,
            email_verify_token_expires TIMESTAMPTZ,
            password_reset_token VARCHAR(64) UNIQUE,
            password_reset_token_expires TIMESTAMPTZ,
            role VARCHAR(20) NOT NULL DEFAULT 'teacher'
        )
    """)
    op.execute(f"""
        INSERT INTO {SCHEMA}.users_old
            (id, username, password_hash, first_name, last_name, school_id, email,
             email_verified, email_verify_token, email_verify_token_expires,
             password_reset_token, password_reset_token_expires, role)
        SELECT id, email, password_hash, first_name, last_name, school_id, email,
               email_verified, email_verify_token, email_verify_token_expires,
               password_reset_token, password_reset_token_expires, role
        FROM {SCHEMA}.users
    """)
    op.execute(f"SELECT setval(pg_get_serial_sequence('{SCHEMA}.users_old', 'id'), (SELECT COALESCE(MAX(id), 1) FROM {SCHEMA}.users_old))")

    op.drop_table("users", schema=SCHEMA)
    op.rename_table("users_old", "users", schema=SCHEMA)
    op.execute(GRANT_SQL.format(SCHEMA))
