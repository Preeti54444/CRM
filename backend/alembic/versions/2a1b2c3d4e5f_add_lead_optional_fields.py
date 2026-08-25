"""add lead optional fields

Revision ID: 2a1b2c3d4e5f
Revises: 1eed7c4f7a
Create Date: 2026-06-10 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '2a1b2c3d4e5f'
down_revision = '1eed7c4f7a'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('leads', sa.Column('alternate_mobile', sa.String(length=50), nullable=True))
    op.add_column('leads', sa.Column('company_email', sa.String(length=255), nullable=True))
    op.add_column('leads', sa.Column('city', sa.String(length=100), nullable=True))
    op.add_column('leads', sa.Column('state', sa.String(length=100), nullable=True))
    op.add_column('leads', sa.Column('funding_amount', sa.Float(), nullable=True))
    op.add_column('leads', sa.Column('lead_source', sa.String(length=100), nullable=True))
    op.add_column('leads', sa.Column('updated_at', sa.DateTime(), nullable=True))


def downgrade() -> None:
    op.drop_column('leads', 'updated_at')
    op.drop_column('leads', 'lead_source')
    op.drop_column('leads', 'funding_amount')
    op.drop_column('leads', 'state')
    op.drop_column('leads', 'city')
    op.drop_column('leads', 'company_email')
    op.drop_column('leads', 'alternate_mobile')
