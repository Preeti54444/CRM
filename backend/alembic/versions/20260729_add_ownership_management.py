"""add ownership management fields to leads and create ownership history table

Revision ID: 20260729_add_ownership_management
Revises: 20260728_add_last_stage_change_date
Create Date: 2026-07-29 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

# revision identifiers, used by Alembic.
revision = '20260729_add_ownership_management'
down_revision = '20260728_add_last_stage_change_date'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add ownership management fields to leads table
    op.add_column('leads', sa.Column('ownership_locked', sa.DateTime(timezone=True), nullable=True))
    op.add_column('leads', sa.Column('ownership_locked_by', UUID(as_uuid=True), nullable=True))
    op.add_column('leads', sa.Column('last_call_date', sa.DateTime(timezone=True), nullable=True))
    op.add_column('leads', sa.Column('last_followup_date', sa.DateTime(timezone=True), nullable=True))
    op.add_column('leads', sa.Column('last_remark_date', sa.DateTime(timezone=True), nullable=True))
    op.add_column('leads', sa.Column('last_document_upload_date', sa.DateTime(timezone=True), nullable=True))
    op.add_column('leads', sa.Column('last_meeting_date', sa.DateTime(timezone=True), nullable=True))
    
    # Create lead_ownership_history table
    op.create_table(
        'lead_ownership_history',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('lead_id', sa.Integer(), nullable=False),
        sa.Column('previous_owner_id', UUID(as_uuid=True), nullable=True),
        sa.Column('previous_owner_name', sa.String(length=255), nullable=True),
        sa.Column('new_owner_id', UUID(as_uuid=True), nullable=False),
        sa.Column('new_owner_name', sa.String(length=255), nullable=False),
        sa.Column('transfer_reason', sa.Text(), nullable=True),
        sa.Column('transfer_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('last_activity_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('days_inactive', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['lead_id'], ['leads.id'], ),
        sa.ForeignKeyConstraint(['new_owner_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['previous_owner_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_lead_ownership_history_id'), 'lead_ownership_history', ['id'], unique=False)
    op.create_index(op.f('ix_lead_ownership_history_lead_id'), 'lead_ownership_history', ['lead_id'], unique=False)


def downgrade() -> None:
    # Drop lead_ownership_history table
    op.drop_index(op.f('ix_lead_ownership_history_lead_id'), table_name='lead_ownership_history')
    op.drop_index(op.f('ix_lead_ownership_history_id'), table_name='lead_ownership_history')
    op.drop_table('lead_ownership_history')
    
    # Remove ownership management fields from leads table
    op.drop_column('leads', 'last_meeting_date')
    op.drop_column('leads', 'last_document_upload_date')
    op.drop_column('leads', 'last_remark_date')
    op.drop_column('leads', 'last_followup_date')
    op.drop_column('leads', 'last_call_date')
    op.drop_column('leads', 'ownership_locked_by')
    op.drop_column('leads', 'ownership_locked')
