"""Merge all migration heads

Revision ID: merge_all_heads
Revises: ('2a1b2c3d4e5f', '3c1d2e4f5a6b', 'add_calls_table', 'add_followup_reminder_fields')
Create Date: 2026-06-28 23:16:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = 'merge_all_heads'
down_revision = ('2a1b2c3d4e5f', '3c1d2e4f5a6b', 'add_calls_table', 'add_followup_reminder_fields')
branch_labels = None
depends_on = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
