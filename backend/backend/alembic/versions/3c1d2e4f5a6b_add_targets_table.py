"""add targets table

Revision ID: 3c1d2e4f5a6b
Revises: 2f14a6e3b89
Create Date: 2026-06-22 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = '3c1d2e4f5a6b'
down_revision = '2f14a6e3b89'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'targets',
        sa.Column('id', sa.Integer(), primary_key=True, nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('role', sa.String(length=50), nullable=False),
        sa.Column('daily_call_target', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('daily_lead_target', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('weekly_lead_target', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('crm_log_deadline', sa.Time(), nullable=True),
        sa.Column('effective_from', sa.Date(), nullable=False),
        sa.Column('updated_by', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.UniqueConstraint('user_id', name='uq_targets_user_id'),
    )


def downgrade() -> None:
    op.drop_table('targets')
