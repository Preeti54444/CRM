"""add lender_cases table

Revision ID: da45c75768aa
Revises: add_notification_events
Create Date: 2026-06-26 11:58:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = 'da45c75768aa'
down_revision = 'add_notification_events'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'lender_cases',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('application_id', sa.String(length=120), nullable=False),
        sa.Column('lead_id', sa.Integer(), nullable=True),
        sa.Column('parent_lead_id', sa.Integer(), nullable=True),
        sa.Column('lead_company', sa.String(length=255), nullable=True),
        sa.Column('lender_name', sa.String(length=255), nullable=False),
        sa.Column('product_type', sa.String(length=255), nullable=True),
        sa.Column('applied_loan_amount', sa.Numeric(), nullable=True),
        sa.Column('application_status', sa.String(length=80), nullable=True),
        sa.Column('contacted_person_name', sa.String(length=255), nullable=True),
        sa.Column('mobile_no', sa.String(length=50), nullable=True),
        sa.Column('linkedin_url', sa.String(length=512), nullable=True),
        sa.Column('outcome_of_call', sa.String(length=512), nullable=True),
        sa.Column('lender_onboarding_form', sa.String(length=10), nullable=True),
        sa.Column('contact_status', sa.String(length=128), nullable=True),
        sa.Column('bank_login_date', sa.String(length=32), nullable=True),
        sa.Column('bank_reference_number', sa.String(length=128), nullable=True),
        sa.Column('sanction_date', sa.String(length=32), nullable=True),
        sa.Column('interest_rate', sa.Numeric(), nullable=True),
        sa.Column('tenure_months', sa.Integer(), nullable=True),
        sa.Column('emi_amount', sa.Numeric(), nullable=True),
        sa.Column('disbursal_amount', sa.Numeric(), nullable=True),
        sa.Column('disbursal_date', sa.String(length=32), nullable=True),
        sa.Column('expected_payout_percent', sa.Numeric(), nullable=True),
        sa.Column('actual_payout_received', sa.Numeric(), nullable=True),
        sa.Column('payout_date', sa.String(length=32), nullable=True),
        sa.Column('tat_tracker', sa.JSON(), nullable=True),
        sa.Column('rejection_reason', sa.String(length=512), nullable=True),
        sa.Column('remarks', sa.JSON(), nullable=True),
        sa.Column('created_by', UUID(as_uuid=True), nullable=True),
        sa.Column('created_by_name', sa.String(length=255), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('application_id'),
        sa.Index('ix_lender_cases_id', 'id'),
        sa.Index('ix_lender_cases_lead_id', 'lead_id'),
        sa.Index('ix_lender_cases_lender_name', 'lender_name'),
        sa.Index('ix_lender_cases_application_status', 'application_status'),
    )


def downgrade() -> None:
    op.drop_table('lender_cases')
