"""add revenue forecast module tables

Revision ID: 20260712_forecast_module
Revises: 20260712_target_mgmt
Create Date: 2026-07-12 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = '20260712_forecast_module'
down_revision = '20260712_target_mgmt'
branch_labels = None
depends_on = None


def upgrade():
    # 1. Pipeline Stage Configuration
    op.create_table(
        'pipeline_stage_configs',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('stage_name', sa.String(100), nullable=False),
        sa.Column('stage_order', sa.Integer(), nullable=False),
        sa.Column('forecast_probability', sa.Float(), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('is_active', sa.Boolean(), server_default='true', nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('stage_name')
    )
    op.create_index('idx_stage_order', 'pipeline_stage_configs', ['stage_order'])

    # 2. Business Vertical Configuration
    op.create_table(
        'business_vertical_configs',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('vertical_name', sa.String(100), nullable=False),
        sa.Column('vertical_code', sa.String(20), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('revenue_formula_version', sa.String(20), server_default='1.0', nullable=False),
        sa.Column('is_active', sa.Boolean(), server_default='true', nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('vertical_name'),
        sa.UniqueConstraint('vertical_code')
    )

    # 3. Product Master
    op.create_table(
        'product_masters',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('product_name', sa.String(100), nullable=False),
        sa.Column('product_code', sa.String(20), nullable=False),
        sa.Column('business_vertical_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('is_active', sa.Boolean(), server_default='true', nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['business_vertical_id'], ['business_vertical_configs.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('product_name'),
        sa.UniqueConstraint('product_code')
    )
    op.create_index('idx_product_name', 'product_masters', ['product_name'])

    # 4. Lender Master
    op.create_table(
        'lender_masters',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('lender_name', sa.String(100), nullable=False),
        sa.Column('lender_code', sa.String(20), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('is_active', sa.Boolean(), server_default='true', nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('lender_name'),
        sa.UniqueConstraint('lender_code')
    )
    op.create_index('idx_lender_name', 'lender_masters', ['lender_name'])

    # 5. Revenue Rule Master
    op.create_table(
        'revenue_rule_masters',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('business_vertical_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('product_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('lender_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('pf_percentage', sa.Float(), server_default='0.0', nullable=False),
        sa.Column('platform_charges', sa.Numeric(), server_default='0.0', nullable=False),
        sa.Column('processing_charges', sa.Numeric(), server_default='0.0', nullable=False),
        sa.Column('tranche_charges', sa.Numeric(), server_default='0.0', nullable=False),
        sa.Column('documentation_charges', sa.Numeric(), server_default='0.0', nullable=False),
        sa.Column('advisory_fees', sa.Numeric(), server_default='0.0', nullable=False),
        sa.Column('mandate_fees', sa.Numeric(), server_default='0.0', nullable=False),
        sa.Column('renewal_charges', sa.Numeric(), server_default='0.0', nullable=False),
        sa.Column('other_commercial_charges', sa.Numeric(), server_default='0.0', nullable=False),
        sa.Column('revenue_share_percentage', sa.Float(), server_default='0.0', nullable=False),
        sa.Column('effective_from', sa.DateTime(), nullable=False),
        sa.Column('effective_to', sa.DateTime(), nullable=True),
        sa.Column('is_active', sa.Boolean(), server_default='true', nullable=False),
        sa.Column('is_default', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('created_by', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['business_vertical_id'], ['business_vertical_configs.id']),
        sa.ForeignKeyConstraint(['product_id'], ['product_masters.id']),
        sa.ForeignKeyConstraint(['lender_id'], ['lender_masters.id']),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_vertical_product_lender', 'revenue_rule_masters', ['business_vertical_id', 'product_id', 'lender_id'])
    op.create_index('idx_effective_dates', 'revenue_rule_masters', ['effective_from', 'effective_to'])

    # 6. Forecast Snapshot
    op.create_table(
        'forecast_snapshots',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('lead_id', sa.Integer(), nullable=False),
        sa.Column('lender_case_id', sa.Integer(), nullable=True),
        sa.Column('deal_name', sa.String(255), nullable=True),
        sa.Column('company_name', sa.String(255), nullable=True),
        sa.Column('relationship_manager_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('relationship_manager_name', sa.String(255), nullable=True),
        sa.Column('business_vertical_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('product_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('lender_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('revenue_rule_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('loan_amount', sa.Numeric(), nullable=False),
        sa.Column('pf_revenue', sa.Numeric(), server_default='0.0', nullable=False),
        sa.Column('platform_charges', sa.Numeric(), server_default='0.0', nullable=False),
        sa.Column('processing_charges', sa.Numeric(), server_default='0.0', nullable=False),
        sa.Column('tranche_charges', sa.Numeric(), server_default='0.0', nullable=False),
        sa.Column('documentation_charges', sa.Numeric(), server_default='0.0', nullable=False),
        sa.Column('advisory_fees', sa.Numeric(), server_default='0.0', nullable=False),
        sa.Column('mandate_fees', sa.Numeric(), server_default='0.0', nullable=False),
        sa.Column('renewal_charges', sa.Numeric(), server_default='0.0', nullable=False),
        sa.Column('other_commercial_charges', sa.Numeric(), server_default='0.0', nullable=False),
        sa.Column('revenue_sharing', sa.Numeric(), server_default='0.0', nullable=False),
        sa.Column('expected_revenue', sa.Numeric(), server_default='0.0', nullable=False),
        sa.Column('weighted_revenue', sa.Numeric(), server_default='0.0', nullable=False),
        sa.Column('current_stage', sa.String(100), nullable=True),
        sa.Column('current_stage_probability', sa.Float(), server_default='0.0', nullable=False),
        sa.Column('mandate_date', sa.DateTime(), nullable=True),
        sa.Column('first_tranche_date', sa.DateTime(), nullable=True),
        sa.Column('expected_disbursement_date', sa.DateTime(), nullable=True),
        sa.Column('is_active', sa.Boolean(), server_default='true', nullable=False),
        sa.Column('status', sa.String(50), server_default='Active', nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('snapshot_version', sa.Integer(), server_default='1', nullable=False),
        sa.ForeignKeyConstraint(['business_vertical_id'], ['business_vertical_configs.id']),
        sa.ForeignKeyConstraint(['product_id'], ['product_masters.id']),
        sa.ForeignKeyConstraint(['lender_id'], ['lender_masters.id']),
        sa.ForeignKeyConstraint(['revenue_rule_id'], ['revenue_rule_masters.id']),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_lead_id_active', 'forecast_snapshots', ['lead_id', 'is_active'])
    op.create_index('idx_stage_probability', 'forecast_snapshots', ['current_stage', 'current_stage_probability'])

    # 7. Forecast Audit Trail
    op.create_table(
        'forecast_audit_trails',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('lead_id', sa.Integer(), nullable=False),
        sa.Column('forecast_snapshot_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('change_type', sa.String(50), nullable=False),
        sa.Column('field_name', sa.String(100), nullable=False),
        sa.Column('previous_value', sa.Text(), nullable=True),
        sa.Column('new_value', sa.Text(), nullable=True),
        sa.Column('revenue_impact', sa.Numeric(), server_default='0.0', nullable=False),
        sa.Column('weighted_revenue_impact', sa.Numeric(), server_default='0.0', nullable=False),
        sa.Column('changed_by', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('changed_by_name', sa.String(255), nullable=True),
        sa.Column('approved_by', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('approval_status', sa.String(20), server_default='pending', nullable=False),
        sa.Column('reason', sa.Text(), nullable=True),
        sa.Column('formula_version', sa.String(20), nullable=True),
        sa.Column('metadata', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('approval_date', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['forecast_snapshot_id'], ['forecast_snapshots.id']),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_lead_change_type', 'forecast_audit_trails', ['lead_id', 'change_type'])
    op.create_index('idx_created_at', 'forecast_audit_trails', ['created_at'])

    # 8. Forecast Result
    op.create_table(
        'forecast_results',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('calculation_date', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('period', sa.String(20), nullable=False),
        sa.Column('total_expected_revenue', sa.Numeric(), server_default='0.0', nullable=False),
        sa.Column('total_weighted_revenue', sa.Numeric(), server_default='0.0', nullable=False),
        sa.Column('revenue_realized', sa.Numeric(), server_default='0.0', nullable=False),
        sa.Column('revenue_collected', sa.Numeric(), server_default='0.0', nullable=False),
        sa.Column('revenue_pending', sa.Numeric(), server_default='0.0', nullable=False),
        sa.Column('revenue_at_risk', sa.Numeric(), server_default='0.0', nullable=False),
        sa.Column('forecast_accuracy_percentage', sa.Float(), server_default='0.0', nullable=False),
        sa.Column('active_revenue_pipeline', sa.Numeric(), server_default='0.0', nullable=False),
        sa.Column('total_active_deals', sa.Integer(), server_default='0', nullable=False),
        sa.Column('deals_by_stage', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('revenue_by_stage', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('filters_applied', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('is_latest', sa.Boolean(), server_default='true', nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_calculation_date_latest', 'forecast_results', ['calculation_date', 'is_latest'])

    # 9. Revenue Realization
    op.create_table(
        'revenue_realizations',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('lead_id', sa.Integer(), nullable=False),
        sa.Column('forecast_snapshot_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('realization_date', sa.DateTime(), nullable=False),
        sa.Column('realized_revenue_amount', sa.Numeric(), nullable=False),
        sa.Column('collected_amount', sa.Numeric(), nullable=True),
        sa.Column('collection_date', sa.DateTime(), nullable=True),
        sa.Column('pf_revenue_realized', sa.Numeric(), server_default='0.0', nullable=False),
        sa.Column('platform_charges_realized', sa.Numeric(), server_default='0.0', nullable=False),
        sa.Column('processing_charges_realized', sa.Numeric(), server_default='0.0', nullable=False),
        sa.Column('tranche_charges_realized', sa.Numeric(), server_default='0.0', nullable=False),
        sa.Column('documentation_charges_realized', sa.Numeric(), server_default='0.0', nullable=False),
        sa.Column('advisory_fees_realized', sa.Numeric(), server_default='0.0', nullable=False),
        sa.Column('mandate_fees_realized', sa.Numeric(), server_default='0.0', nullable=False),
        sa.Column('renewal_charges_realized', sa.Numeric(), server_default='0.0', nullable=False),
        sa.Column('other_charges_realized', sa.Numeric(), server_default='0.0', nullable=False),
        sa.Column('forecasted_revenue', sa.Numeric(), nullable=True),
        sa.Column('variance', sa.Numeric(), nullable=True),
        sa.Column('variance_percentage', sa.Float(), nullable=True),
        sa.Column('status', sa.String(50), server_default='realized', nullable=False),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('recorded_by', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['forecast_snapshot_id'], ['forecast_snapshots.id']),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_lead_realization_date', 'revenue_realizations', ['lead_id', 'realization_date'])

    # 10. Tranche Schedule
    op.create_table(
        'tranche_schedules',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('lead_id', sa.Integer(), nullable=False),
        sa.Column('forecast_snapshot_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('tranche_number', sa.Integer(), nullable=False),
        sa.Column('tranche_amount', sa.Numeric(), nullable=False),
        sa.Column('expected_date', sa.DateTime(), nullable=False),
        sa.Column('actual_date', sa.DateTime(), nullable=True),
        sa.Column('tranche_charges', sa.Numeric(), server_default='0.0', nullable=False),
        sa.Column('documentation_charges', sa.Numeric(), server_default='0.0', nullable=False),
        sa.Column('other_charges', sa.Numeric(), server_default='0.0', nullable=False),
        sa.Column('status', sa.String(50), server_default='pending', nullable=False),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['forecast_snapshot_id'], ['forecast_snapshots.id']),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_lead_tranche_date', 'tranche_schedules', ['lead_id', 'expected_date'])

    # 11. Renewal Schedule
    op.create_table(
        'renewal_schedules',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('lead_id', sa.Integer(), nullable=False),
        sa.Column('forecast_snapshot_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('renewal_number', sa.Integer(), nullable=False),
        sa.Column('original_mandate_date', sa.DateTime(), nullable=True),
        sa.Column('renewal_expected_date', sa.DateTime(), nullable=False),
        sa.Column('renewal_actual_date', sa.DateTime(), nullable=True),
        sa.Column('renewal_charges', sa.Numeric(), server_default='0.0', nullable=False),
        sa.Column('renewal_amount', sa.Numeric(), nullable=False),
        sa.Column('status', sa.String(50), server_default='pending', nullable=False),
        sa.Column('renewal_sanctioned', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['forecast_snapshot_id'], ['forecast_snapshots.id']),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_lead_renewal_date', 'renewal_schedules', ['lead_id', 'renewal_expected_date'])


def downgrade():
    op.drop_table('renewal_schedules')
    op.drop_table('tranche_schedules')
    op.drop_table('revenue_realizations')
    op.drop_table('forecast_results')
    op.drop_table('forecast_audit_trails')
    op.drop_table('forecast_snapshots')
    op.drop_table('revenue_rule_masters')
    op.drop_table('lender_masters')
    op.drop_table('product_masters')
    op.drop_table('business_vertical_configs')
    op.drop_table('pipeline_stage_configs')
