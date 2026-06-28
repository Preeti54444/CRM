"""add notification_events table

Revision ID: add_notification_events
Revises: 0b3f1b9e8a
Create Date: 2026-06-26 11:08:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = 'add_notification_events'
down_revision = '0b3f1b9e8a'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'notification_events',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column('user_id', UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('message', sa.String(1000), nullable=False),
        sa.Column('type', sa.String(50), nullable=False, server_default='general'),
        sa.Column('related_task_id', UUID(as_uuid=True), nullable=True),
        sa.Column('is_read', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Index('ix_notification_events_id', 'id'),
        sa.Index('ix_notification_events_user_id', 'user_id'),
    )


def downgrade() -> None:
    op.drop_table('notification_events')
