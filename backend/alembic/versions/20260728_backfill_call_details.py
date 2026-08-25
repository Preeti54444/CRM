"""backfill call details from existing fields

Revision ID: 20260728_backfill_call_details
Revises: 20260728_add_call_details_columns
Create Date: 2026-07-28 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.sql import table, column

# revision identifiers, used by Alembic.
revision = '20260728_backfill_call_details'
down_revision = '20260728_add_call_details_columns'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Backfill customer_company_name from receiver_name
    op.execute("""
        UPDATE call_data 
        SET customer_company_name = receiver_name 
        WHERE customer_company_name IS NULL AND receiver_name IS NOT NULL
    """)
    
    # Backfill contact_person_name from caller_name
    op.execute("""
        UPDATE call_data 
        SET contact_person_name = caller_name 
        WHERE contact_person_name IS NULL AND caller_name IS NOT NULL
    """)
    
    # Backfill action from purpose if not set
    op.execute("""
        UPDATE call_data 
        SET action = purpose 
        WHERE action IS NULL AND purpose IS NOT NULL
    """)


def downgrade() -> None:
    # No need to revert backfill as it's just data migration
    pass
