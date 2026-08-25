"""add calls table

Revision ID: add_calls_table
Revises: da45c75768aa
Create Date: 2026-06-27 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'add_calls_table'
down_revision = 'da45c75768aa'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'call_data',
        sa.Column('id', sa.Integer(), primary_key=True, nullable=False),
        sa.Column('call_id', sa.String(length=100), nullable=False),
        sa.Column('call_type', sa.String(length=50), nullable=False),
        sa.Column('call_date', sa.Date(), nullable=False),
        sa.Column('call_time', sa.Time(), nullable=True),
        sa.Column('duration_seconds', sa.Integer(), nullable=True),
        sa.Column('caller_name', sa.String(length=255), nullable=True),
        sa.Column('caller_phone', sa.String(length=50), nullable=False),
        sa.Column('receiver_name', sa.String(length=255), nullable=True),
        sa.Column('receiver_phone', sa.String(length=50), nullable=True),
        sa.Column('receiver_email', sa.String(length=255), nullable=True),
        sa.Column('lead_id', sa.Integer(), sa.ForeignKey('leads.id'), nullable=True),
        sa.Column('purpose', sa.String(length=100), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='Completed'),
        sa.Column('priority', sa.String(length=50), nullable=False, server_default='Normal'),
        sa.Column('outcome', sa.Text(), nullable=True),
        sa.Column('followup_required', sa.String(length=50), nullable=True),
        sa.Column('followup_date', sa.Date(), nullable=True),
        sa.Column('followup_notes', sa.Text(), nullable=True),
        sa.Column('recording_link', sa.String(length=500), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_by', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
    )
    op.create_index(op.f('ix_call_data_call_id'), 'call_data', ['call_id'], unique=True)
    op.create_index(op.f('ix_call_data_id'), 'call_data', ['id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_call_data_id'), table_name='call_data')
    op.drop_index(op.f('ix_call_data_call_id'), table_name='call_data')
    op.drop_table('call_data')
