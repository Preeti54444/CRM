"""add designation to leads

Revision ID: 20260724_add_designation
Revises: b3662b950d90
Create Date: 2026-07-24 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '20260724_add_designation'
down_revision = 'b3662b950d90'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('leads', sa.Column('designation', sa.String(length=255), nullable=True))


def downgrade() -> None:
    op.drop_column('leads', 'designation')
