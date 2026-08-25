"""add lead rating and lender related fields

Revision ID: 20260724_add_lead_rating_and_lender_fields
Revises: 20260724_add_designation
Create Date: 2026-07-24 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '20260724_add_lead_rating_and_lender_fields'
down_revision = '20260724_add_designation'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('leads', sa.Column('credit_rating', sa.String(length=100), nullable=True))
    op.add_column('leads', sa.Column('rating_date', sa.String(length=50), nullable=True))
    op.add_column('leads', sa.Column('rating_agency', sa.String(length=255), nullable=True))
    op.add_column('leads', sa.Column('lender_related_detail', sa.String(length=1000), nullable=True))


def downgrade() -> None:
    op.drop_column('leads', 'lender_related_detail')
    op.drop_column('leads', 'rating_agency')
    op.drop_column('leads', 'rating_date')
    op.drop_column('leads', 'credit_rating')
