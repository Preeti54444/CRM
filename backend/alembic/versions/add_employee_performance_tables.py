"""add employee performance tables

Revision ID: add_employee_performance
Revises: 
Create Date: 2025-01-15 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'add_employee_performance'
down_revision = None  # This will be set to the latest migration
branch_labels = None
depends_on = None


def upgrade():
    # Create employee_performance_daily table
    op.create_table(
        'employee_performance_daily',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('employee_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('date', sa.DateTime(), nullable=False),
        sa.Column('calls_completed', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('leads_created', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('exploration_calls', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('meetings_booked', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('achievement_percentage', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('zone', sa.String(length=20), nullable=False, server_default='red'),
        sa.Column('last_activity', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['employee_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_employee_performance_daily_employee_id'), 'employee_performance_daily', ['employee_id'], unique=False)
    op.create_index(op.f('ix_employee_performance_daily_date'), 'employee_performance_daily', ['date'], unique=False)
    
    # Create employee_midweek_reports table
    op.create_table(
        'employee_midweek_reports',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('employee_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('week_start', sa.DateTime(), nullable=False),
        sa.Column('week_end', sa.DateTime(), nullable=False),
        sa.Column('calls_completed', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('leads_completed', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('exploration_calls_completed', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('achievement_percentage', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('zone', sa.String(length=20), nullable=False, server_default='red'),
        sa.Column('generated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['employee_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_employee_midweek_reports_employee_id'), 'employee_midweek_reports', ['employee_id'], unique=False)
    
    # Create employee_weekly_reports table
    op.create_table(
        'employee_weekly_reports',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('employee_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('week_start', sa.DateTime(), nullable=False),
        sa.Column('week_end', sa.DateTime(), nullable=False),
        sa.Column('total_calls', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('total_leads', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('total_exploration_calls', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('total_meetings', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('achievement_percentage', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('performance_score', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('zone', sa.String(length=20), nullable=False, server_default='red'),
        sa.Column('rank', sa.Integer(), nullable=True),
        sa.Column('generated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['employee_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_employee_weekly_reports_employee_id'), 'employee_weekly_reports', ['employee_id'], unique=False)
    
    # Create logout_override_logs table
    op.create_table(
        'logout_override_logs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('employee_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('approved_by', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('reason', sa.Text(), nullable=False),
        sa.Column('calls_completed', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('leads_completed', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['employee_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['approved_by'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_logout_override_logs_employee_id'), 'logout_override_logs', ['employee_id'], unique=False)


def downgrade():
    # Drop tables in reverse order
    op.drop_index(op.f('ix_logout_override_logs_employee_id'), table_name='logout_override_logs')
    op.drop_table('logout_override_logs')
    
    op.drop_index(op.f('ix_employee_weekly_reports_employee_id'), table_name='employee_weekly_reports')
    op.drop_table('employee_weekly_reports')
    
    op.drop_index(op.f('ix_employee_midweek_reports_employee_id'), table_name='employee_midweek_reports')
    op.drop_table('employee_midweek_reports')
    
    op.drop_index(op.f('ix_employee_performance_daily_date'), table_name='employee_performance_daily')
    op.drop_index(op.f('ix_employee_performance_daily_employee_id'), table_name='employee_performance_daily')
    op.drop_table('employee_performance_daily')
