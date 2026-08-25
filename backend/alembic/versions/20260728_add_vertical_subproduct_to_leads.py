"""add vertical and sub_product to leads

Revision ID: 20260728_add_vertical_subproduct
Revises: 0aa1ac6de772
Create Date: 2026-07-28 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '20260728_add_vertical_subproduct'
down_revision = '0aa1ac6de772'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('leads', sa.Column('vertical', sa.String(length=100), nullable=True))
    op.add_column('leads', sa.Column('sub_product', sa.String(length=100), nullable=True))


def downgrade() -> None:
    op.drop_column('leads', 'sub_product')
    op.drop_column('leads', 'vertical')
