"""add daily reports table

Revision ID: 1eed7c4f7a
Revises: 0b3f1b9e8a
Create Date: 2026-06-10 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '1eed7c4f7a'
down_revision = '0b3f1b9e8a'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'daily_reports',
        sa.Column('id', sa.Integer(), primary_key=True, nullable=False),
        sa.Column('report_type', sa.String(length=20), nullable=False),
        sa.Column('payload', sa.JSON(), nullable=False),
        sa.Column('created_by', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('created_by_name', sa.String(length=255), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
    )


def downgrade() -> None:
    op.drop_table('daily_reports')
