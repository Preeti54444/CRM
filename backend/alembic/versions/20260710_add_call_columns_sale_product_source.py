"""add call columns sale/product/source

Revision ID: 20260710_add_call_columns_sale_product_source
Revises: add_calls_table
Create Date: 2026-07-10 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '20260710_add_call_columns_sale_product_source'
down_revision = 'add_calls_table'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('call_data', sa.Column('sale_executive', sa.String(length=255), nullable=True))
    op.add_column('call_data', sa.Column('product', sa.String(length=255), nullable=True))
    op.add_column('call_data', sa.Column('source', sa.String(length=255), nullable=True))


def downgrade() -> None:
    op.drop_column('call_data', 'source')
    op.drop_column('call_data', 'product')
    op.drop_column('call_data', 'sale_executive')
