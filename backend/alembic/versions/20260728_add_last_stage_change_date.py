"""add last_stage_change_date to leads

Revision ID: 20260728_add_last_stage_change_date
Revises: 20260728_add_vertical_subproduct
Create Date: 2026-07-28 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa
from datetime import datetime

# revision identifiers, used by Alembic.
revision = '20260728_add_last_stage_change_date'
down_revision = '20260728_add_vertical_subproduct'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('leads', sa.Column('last_stage_change_date', sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column('leads', 'last_stage_change_date')
