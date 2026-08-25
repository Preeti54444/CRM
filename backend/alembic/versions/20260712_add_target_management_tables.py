"""add target management tables

Revision ID: 20260712_target_mgmt
Revises: add_employee_performance
Create Date: 2026-07-12 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = '20260712_target_mgmt'
down_revision = 'add_employee_performance'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'employee_carry_forward',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('employee_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('date', sa.Date(), nullable=False),
        sa.Column('week_start', sa.Date(), nullable=False),
        sa.Column('carry_forward_calls', sa.Integer(), server_default='0', nullable=False),
        sa.Column('carry_forward_leads', sa.Integer(), server_default='0', nullable=False),
        sa.Column('daily_calls_target', sa.Integer(), server_default='0', nullable=False),
        sa.Column('daily_leads_target', sa.Integer(), server_default='0', nullable=False),
        sa.Column('total_required_calls', sa.Integer(), server_default='0', nullable=False),
        sa.Column('total_required_leads', sa.Integer(), server_default='0', nullable=False),
        sa.Column('calls_completed', sa.Integer(), server_default='0', nullable=False),
        sa.Column('leads_completed', sa.Integer(), server_default='0', nullable=False),
        sa.Column('remaining_calls', sa.Integer(), server_default='0', nullable=False),
        sa.Column('remaining_leads', sa.Integer(), server_default='0', nullable=False),
        sa.Column('is_closed', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['employee_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_employee_carry_forward_employee_id', 'employee_carry_forward', ['employee_id'])
    op.create_index('ix_employee_carry_forward_date', 'employee_carry_forward', ['date'])

    op.create_table(
        'target_audit_logs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('employee_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('actor_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('action', sa.String(100), nullable=False),
        sa.Column('entity_type', sa.String(50), nullable=True),
        sa.Column('entity_id', sa.String(100), nullable=True),
        sa.Column('details', sa.Text(), nullable=True),
        sa.Column('metadata_json', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['employee_id'], ['users.id']),
        sa.ForeignKeyConstraint(['actor_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_target_audit_logs_action', 'target_audit_logs', ['action'])
    op.create_index('ix_target_audit_logs_created_at', 'target_audit_logs', ['created_at'])

    op.create_table(
        'employee_badges',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('employee_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('badge_type', sa.String(50), nullable=False),
        sa.Column('badge_name', sa.String(100), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('earned_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('week_start', sa.Date(), nullable=True),
        sa.ForeignKeyConstraint(['employee_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_employee_badges_employee_id', 'employee_badges', ['employee_id'])

    op.create_table(
        'target_early_logout_requests',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('employee_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('reviewer_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('reason', sa.Text(), nullable=False),
        sa.Column('supporting_note', sa.Text(), nullable=True),
        sa.Column('status', sa.String(20), server_default='pending', nullable=False),
        sa.Column('remaining_calls', sa.Integer(), server_default='0', nullable=False),
        sa.Column('remaining_leads', sa.Integer(), server_default='0', nullable=False),
        sa.Column('carry_forward_calls', sa.Integer(), server_default='0', nullable=False),
        sa.Column('carry_forward_leads', sa.Integer(), server_default='0', nullable=False),
        sa.Column('reviewed_at', sa.DateTime(), nullable=True),
        sa.Column('review_comment', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['employee_id'], ['users.id']),
        sa.ForeignKeyConstraint(['reviewer_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_target_early_logout_employee_id', 'target_early_logout_requests', ['employee_id'])


def downgrade():
    op.drop_table('target_early_logout_requests')
    op.drop_table('employee_badges')
    op.drop_table('target_audit_logs')
    op.drop_table('employee_carry_forward')
