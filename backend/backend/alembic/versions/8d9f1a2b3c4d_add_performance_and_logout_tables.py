"""add performance and logout tables

Revision ID: 8d9f1a2b3c4d
Revises: 4c2d3e5f6a7b
Create Date: 2026-06-24 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '8d9f1a2b3c4d'
down_revision = '4c2d3e5f6a7b'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'employee_performance_daily',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('employee_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('date', sa.Date(), nullable=False),
        sa.Column('calls_completed', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('leads_created', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('exploration_calls', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('meetings_booked', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('achievement_percentage', sa.Float(), nullable=False, server_default='0'),
        sa.Column('zone', sa.String(length=16), nullable=False, server_default='red'),
        sa.Column('last_activity', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
    )

    op.create_table(
        'employee_midweek_reports',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('employee_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('week_start', sa.Date(), nullable=False),
        sa.Column('week_end', sa.Date(), nullable=False),
        sa.Column('calls_completed', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('leads_completed', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('exploration_calls_completed', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('achievement_percentage', sa.Float(), nullable=False, server_default='0'),
        sa.Column('zone', sa.String(length=16), nullable=False, server_default='red'),
        sa.Column('generated_at', sa.DateTime(), nullable=True),
    )

    op.create_table(
        'employee_weekly_reports',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('employee_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('week_start', sa.Date(), nullable=False),
        sa.Column('week_end', sa.Date(), nullable=False),
        sa.Column('total_calls', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('total_leads', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('total_exploration_calls', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('total_meetings', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('achievement_percentage', sa.Float(), nullable=False, server_default='0'),
        sa.Column('performance_score', sa.Float(), nullable=False, server_default='0'),
        sa.Column('zone', sa.String(length=16), nullable=False, server_default='red'),
        sa.Column('rank', sa.Integer(), nullable=True),
        sa.Column('generated_at', sa.DateTime(), nullable=True),
    )

    op.create_table(
        'logout_override_logs',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('employee_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('approved_by', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('reason', sa.String(length=1000), nullable=False),
        sa.Column('calls_completed', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('leads_completed', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(), nullable=True),
    )


def downgrade():
    op.drop_table('logout_override_logs')
    op.drop_table('employee_weekly_reports')
    op.drop_table('employee_midweek_reports')
    op.drop_table('employee_performance_daily')
