"""add ageing and action fields to leads

Revision ID: 20260827_add_lead_ageing_and_action
Revises: 20260729_add_ownership_management
Create Date: 2026-08-27 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa


revision = "20260827_add_lead_ageing_and_action"
down_revision = "20260729_add_ownership_management"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("leads", sa.Column("ageing", sa.Integer(), nullable=True))
    op.add_column("leads", sa.Column("action", sa.String(length=255), nullable=True))


def downgrade() -> None:
    op.drop_column("leads", "action")
    op.drop_column("leads", "ageing")