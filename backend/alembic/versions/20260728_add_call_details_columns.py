"""add call details columns

Revision ID: 20260728_add_call_details_columns
Revises: 20260710_add_call_columns_sale_product_source
Create Date: 2026-07-28 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '20260728_add_call_details_columns'
down_revision = 'fd786b20cc96'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('call_data', sa.Column('customer_company_name', sa.String(length=255), nullable=True))
    op.add_column('call_data', sa.Column('contact_person_name', sa.String(length=255), nullable=True))
    op.add_column('call_data', sa.Column('designation', sa.String(length=255), nullable=True))
    op.add_column('call_data', sa.Column('action', sa.String(length=255), nullable=True))


def downgrade() -> None:
    op.drop_column('call_data', 'action')
    op.drop_column('call_data', 'designation')
    op.drop_column('call_data', 'contact_person_name')
    op.drop_column('call_data', 'customer_company_name')
