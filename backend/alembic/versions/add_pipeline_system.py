"""Add pipeline system for automatic lead movement

Revision ID: add_pipeline_system
Revises: 
Create Date: 2026-07-12

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'add_pipeline_system'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    # Add pipeline_stage column to leads table
    op.add_column('leads', sa.Column('pipeline_stage', sa.String(100), nullable=True, server_default='New Leads'))
    
    # Create pipeline_configurations table
    op.create_table(
        'pipeline_configurations',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('lead_status', sa.String(100), nullable=False, unique=True),
        sa.Column('pipeline_stage', sa.String(100), nullable=False),
        sa.Column('stage_order', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('allowed_transitions', sa.Text(), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
    )
    op.create_index('ix_pipeline_configurations_lead_status', 'pipeline_configurations', ['lead_status'])
    op.create_index('ix_pipeline_configurations_id', 'pipeline_configurations', ['id'])
    
    # Create pipeline_transition_audits table
    op.create_table(
        'pipeline_transition_audits',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('lead_id', sa.Integer(), nullable=False),
        sa.Column('previous_status', sa.String(100), nullable=True),
        sa.Column('new_status', sa.String(100), nullable=False),
        sa.Column('previous_pipeline_stage', sa.String(100), nullable=True),
        sa.Column('new_pipeline_stage', sa.String(100), nullable=False),
        sa.Column('changed_by', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('changed_by_name', sa.String(255), nullable=True),
        sa.Column('remarks', sa.Text(), nullable=True),
        sa.Column('transition_type', sa.String(50), nullable=False, server_default='automatic'),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['lead_id'], ['leads.id']),
        sa.ForeignKeyConstraint(['changed_by'], ['users.id']),
    )
    op.create_index('ix_pipeline_transition_audits_lead_id', 'pipeline_transition_audits', ['lead_id'])
    op.create_index('ix_pipeline_transition_audits_id', 'pipeline_transition_audits', ['id'])


def downgrade():
    # Drop pipeline_transition_audits table
    op.drop_index('ix_pipeline_transition_audits_id', table_name='pipeline_transition_audits')
    op.drop_index('ix_pipeline_transition_audits_lead_id', table_name='pipeline_transition_audits')
    op.drop_table('pipeline_transition_audits')
    
    # Drop pipeline_configurations table
    op.drop_index('ix_pipeline_configurations_id', table_name='pipeline_configurations')
    op.drop_index('ix_pipeline_configurations_lead_status', table_name='pipeline_configurations')
    op.drop_table('pipeline_configurations')
    
    # Remove pipeline_stage column from leads table
    op.drop_column('leads', 'pipeline_stage')
