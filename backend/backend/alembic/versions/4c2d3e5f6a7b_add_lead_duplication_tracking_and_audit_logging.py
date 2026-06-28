"""add lead duplication tracking and audit logging

Revision ID: 4c2d3e5f6a7b
Revises: 3c1d2e4f5a6b
Create Date: 2026-06-24 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '4c2d3e5f6a7b'
down_revision = '3c1d2e4f5a6b'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create lead_duplicate_logs table
    op.create_table(
        'lead_duplicate_logs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('new_lead_data', postgresql.JSON(), nullable=False),
        sa.Column('existing_lead_id', sa.Integer(), nullable=False),
        sa.Column('duplicate_type', sa.String(length=50), nullable=False),
        sa.Column('created_by', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['existing_lead_id'], ['leads.id'], ),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.Index('ix_lead_duplicate_logs_id', 'id'),
        sa.Index('ix_lead_duplicate_logs_created_at', 'created_at'),
    )
    
    # Add columns to leads table
    op.add_column('leads', sa.Column('duplicate_status', sa.String(length=50), nullable=False, server_default='Unique'))
    op.add_column('leads', sa.Column('duplicate_reason', sa.String(length=500), nullable=True))
    op.add_column('leads', sa.Column('duplicate_of_lead_id', sa.Integer(), nullable=True))
    
    # Add foreign key constraint for duplicate_of_lead_id
    op.create_foreign_key(
        'fk_leads_duplicate_of_lead_id',
        'leads',
        'leads',
        ['duplicate_of_lead_id'],
        ['id']
    )
    
    # Create indexes on leads table for duplicate detection
    op.create_index('ix_leads_mobile', 'leads', ['mobile'])
    op.create_index('ix_leads_alternate_mobile', 'leads', ['alternate_mobile'])
    op.create_index('ix_leads_email', 'leads', ['email'])
    op.create_index('ix_leads_company_email', 'leads', ['company_email'])
    op.create_index('ix_leads_company_name', 'leads', ['company_name'])


def downgrade() -> None:
    # Drop indexes
    op.drop_index('ix_leads_company_name', table_name='leads')
    op.drop_index('ix_leads_company_email', table_name='leads')
    op.drop_index('ix_leads_email', table_name='leads')
    op.drop_index('ix_leads_alternate_mobile', table_name='leads')
    op.drop_index('ix_leads_mobile', table_name='leads')
    
    # Drop foreign key constraint
    op.drop_constraint('fk_leads_duplicate_of_lead_id', 'leads', type_='foreignkey')
    
    # Remove columns from leads table
    op.drop_column('leads', 'duplicate_of_lead_id')
    op.drop_column('leads', 'duplicate_reason')
    op.drop_column('leads', 'duplicate_status')
    
    # Drop lead_duplicate_logs table
    op.drop_table('lead_duplicate_logs')
