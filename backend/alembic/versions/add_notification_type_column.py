"""add notification type column

Revision ID: add_notification_type
Revises: add_employee_performance
Create Date: 2025-01-15 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_notification_type'
down_revision = 'add_employee_performance'
branch_labels = None
depends_on = None


def upgrade():
    # Add type column to notifications table
    op.add_column('notifications', sa.Column('type', sa.String(length=50), nullable=False, server_default='general'))


def downgrade():
    # Remove type column from notifications table
    op.drop_column('notifications', 'type')
