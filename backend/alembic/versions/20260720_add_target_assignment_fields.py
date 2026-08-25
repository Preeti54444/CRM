"""Add target assignment tracking fields

Revision ID: 20260720_add_target_assignment
Revises: 3c1d2e4f5a6b
Create Date: 2026-07-20 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = '20260720_add_target_assignment'
down_revision = '3c1d2e4f5a6b'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add new columns to targets table
    op.add_column('targets', sa.Column('assigned_by', postgresql.UUID(as_uuid=True), nullable=True))
    op.add_column('targets', sa.Column('assigned_at', sa.DateTime(), nullable=True))
    op.add_column('targets', sa.Column('notification_sent', sa.Boolean(), nullable=False, server_default='False'))
    
    # Add foreign key constraint for assigned_by
    op.create_foreign_key(
        'fk_targets_assigned_by_user_id',
        'targets',
        'users',
        ['assigned_by'],
        ['id'],
        ondelete='SET NULL'
    )


def downgrade() -> None:
    # Remove foreign key constraint
    op.drop_constraint('fk_targets_assigned_by_user_id', 'targets', type_='foreignkey')
    
    # Drop the new columns
    op.drop_column('targets', 'notification_sent')
    op.drop_column('targets', 'assigned_at')
    op.drop_column('targets', 'assigned_by')
