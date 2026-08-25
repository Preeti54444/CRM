"""add followup reminder fields

Revision ID: add_followup_reminder_fields
Revises: da45c75768aa
Create Date: 2026-06-27 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'add_followup_reminder_fields'
down_revision = 'da45c75768aa'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add new columns to followups table
    op.add_column('followups', sa.Column('followup_time', sa.Time(), nullable=True))
    op.add_column('followups', sa.Column('next_followup_time', sa.Time(), nullable=True))
    op.add_column('followups', sa.Column('reminder_sent', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('followups', sa.Column('followup_completed', sa.Boolean(), nullable=False, server_default='false'))
    
    # Create indexes for performance optimization
    op.create_index('ix_followups_lead_id', 'followups', ['lead_id'])
    op.create_index('ix_followups_assigned_to', 'followups', ['assigned_to'])
    op.create_index('ix_followups_followup_date', 'followups', ['followup_date'])
    op.create_index('ix_followups_followup_time', 'followups', ['followup_time'])
    op.create_index('ix_followups_status', 'followups', ['status'])
    op.create_index('ix_followups_followup_completed', 'followups', ['followup_completed'])


def downgrade() -> None:
    # Drop indexes
    op.drop_index('ix_followups_followup_completed', 'followups')
    op.drop_index('ix_followups_status', 'followups')
    op.drop_index('ix_followups_followup_time', 'followups')
    op.drop_index('ix_followups_followup_date', 'followups')
    op.drop_index('ix_followups_assigned_to', 'followups')
    op.drop_index('ix_followups_lead_id', 'followups')
    
    # Drop columns
    op.drop_column('followups', 'followup_completed')
    op.drop_column('followups', 'reminder_sent')
    op.drop_column('followups', 'next_followup_time')
    op.drop_column('followups', 'followup_time')
