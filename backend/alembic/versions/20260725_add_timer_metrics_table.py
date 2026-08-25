"""add timer_metrics table

Revision ID: 20260725_add_timer_metrics_table
Revises: fd786b20cc96
Create Date: 2026-07-25 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '20260725_add_timer_metrics_table'
down_revision = 'fd786b20cc96'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'timer_metrics',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('work_seconds', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('call_seconds', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('break_seconds', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('meeting_seconds', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('call_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_timer_metrics_user_id'), 'timer_metrics', ['user_id'], unique=False)


def downgrade():
    op.drop_index(op.f('ix_timer_metrics_user_id'), table_name='timer_metrics')
    op.drop_table('timer_metrics')
