"""add comprehensive lead fields from form

Revision ID: 20260727_add_comprehensive_lead_fields
Revises: 20260724_add_designation
Create Date: 2026-07-27 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '20260727_add_comprehensive_lead_fields'
down_revision = '20260724_add_designation'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Basic Info
    op.add_column('leads', sa.Column('location', sa.String(length=255), nullable=True))
    
    # Assigned User
    op.add_column('leads', sa.Column('sales_executive', sa.String(length=255), nullable=True))
    op.add_column('leads', sa.Column('date_of_entry', sa.Date(), nullable=True))
    
    # Company Registration Details
    op.add_column('leads', sa.Column('gst_number', sa.String(length=100), nullable=True))
    op.add_column('leads', sa.Column('pan_number', sa.String(length=100), nullable=True))
    op.add_column('leads', sa.Column('entity_type', sa.String(length=100), nullable=True))
    op.add_column('leads', sa.Column('annual_turnover', sa.String(length=100), nullable=True))
    op.add_column('leads', sa.Column('business_vintage', sa.String(length=100), nullable=True))
    op.add_column('leads', sa.Column('number_of_employees', sa.Integer(), nullable=True))
    op.add_column('leads', sa.Column('year_of_incorporation', sa.Integer(), nullable=True))
    op.add_column('leads', sa.Column('registered_office_address', sa.Text(), nullable=True))
    op.add_column('leads', sa.Column('business_description', sa.Text(), nullable=True))
    
    # Industry & Credit Profile
    op.add_column('leads', sa.Column('industry', sa.String(length=255), nullable=True))
    op.add_column('leads', sa.Column('promoter_cibil_score', sa.String(length=100), nullable=True))
    op.add_column('leads', sa.Column('npa_history', sa.String(length=100), nullable=True))
    op.add_column('leads', sa.Column('guarantee_available', sa.String(length=100), nullable=True))
    op.add_column('leads', sa.Column('current_ratio', sa.String(length=100), nullable=True))
    op.add_column('leads', sa.Column('interest_coverage_ratio', sa.String(length=100), nullable=True))
    op.add_column('leads', sa.Column('dscr', sa.String(length=100), nullable=True))
    
    # Call Details
    op.add_column('leads', sa.Column('date_of_first_call', sa.Date(), nullable=True))
    op.add_column('leads', sa.Column('purpose_of_call', sa.String(length=100), nullable=True))
    op.add_column('leads', sa.Column('product_service_discussed', sa.String(length=255), nullable=True))
    op.add_column('leads', sa.Column('call_outcome', sa.String(length=100), nullable=True))
    
    # Status & Lead Management
    op.add_column('leads', sa.Column('current_status', sa.String(length=100), nullable=True))
    op.add_column('leads', sa.Column('final_outcome', sa.String(length=100), nullable=True))
    op.add_column('leads', sa.Column('lead_stage', sa.String(length=100), nullable=True))
    op.add_column('leads', sa.Column('last_activity_date', sa.Date(), nullable=True))
    
    # Proposal & Follow-up
    op.add_column('leads', sa.Column('proposal_shared', sa.String(length=50), nullable=True))
    op.add_column('leads', sa.Column('next_followup_date', sa.Date(), nullable=True))
    op.add_column('leads', sa.Column('followup_time', sa.Time(), nullable=True))
    op.add_column('leads', sa.Column('followup_type', sa.String(length=100), nullable=True))
    op.add_column('leads', sa.Column('followup_note', sa.Text(), nullable=True))
    
    # Notes & Learning
    op.add_column('leads', sa.Column('learning_challenge', sa.Text(), nullable=True))


def downgrade() -> None:
    # Notes & Learning
    op.drop_column('leads', 'learning_challenge')
    
    # Proposal & Follow-up
    op.drop_column('leads', 'followup_note')
    op.drop_column('leads', 'followup_type')
    op.drop_column('leads', 'followup_time')
    op.drop_column('leads', 'next_followup_date')
    op.drop_column('leads', 'proposal_shared')
    
    # Status & Lead Management
    op.drop_column('leads', 'last_activity_date')
    op.drop_column('leads', 'lead_stage')
    op.drop_column('leads', 'final_outcome')
    op.drop_column('leads', 'current_status')
    
    # Call Details
    op.drop_column('leads', 'call_outcome')
    op.drop_column('leads', 'product_service_discussed')
    op.drop_column('leads', 'purpose_of_call')
    op.drop_column('leads', 'date_of_first_call')
    
    # Industry & Credit Profile
    op.drop_column('leads', 'dscr')
    op.drop_column('leads', 'interest_coverage_ratio')
    op.drop_column('leads', 'current_ratio')
    op.drop_column('leads', 'guarantee_available')
    op.drop_column('leads', 'npa_history')
    op.drop_column('leads', 'promoter_cibil_score')
    op.drop_column('leads', 'industry')
    
    # Company Registration Details
    op.drop_column('leads', 'business_description')
    op.drop_column('leads', 'registered_office_address')
    op.drop_column('leads', 'year_of_incorporation')
    op.drop_column('leads', 'number_of_employees')
    op.drop_column('leads', 'business_vintage')
    op.drop_column('leads', 'annual_turnover')
    op.drop_column('leads', 'entity_type')
    op.drop_column('leads', 'pan_number')
    op.drop_column('leads', 'gst_number')
    
    # Assigned User
    op.drop_column('leads', 'date_of_entry')
    op.drop_column('leads', 'sales_executive')
    
    # Basic Info
    op.drop_column('leads', 'location')
