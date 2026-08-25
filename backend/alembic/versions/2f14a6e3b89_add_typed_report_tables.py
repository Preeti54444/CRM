"""add typed report tables

Revision ID: 2f14a6e3b89
Revises: 1eed7c4f7a
Create Date: 2026-06-18 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '2f14a6e3b89'
down_revision = '1eed7c4f7a'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'sod_reports',
        sa.Column('id', sa.Integer(), primary_key=True, nullable=False),
        sa.Column('created_by', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('created_by_name', sa.String(length=255), nullable=False),
        sa.Column('report_date', sa.DateTime(), nullable=False),
        sa.Column('sales_executive', sa.String(length=255), nullable=True),
        sa.Column('email', sa.String(length=255), nullable=True),
        sa.Column('territory_region', sa.String(length=255), nullable=True),
        sa.Column('target_for_today', sa.Text(), nullable=True),
        sa.Column('key_meetings_planned', sa.Text(), nullable=True),
        sa.Column('focus_industry_segment', sa.Text(), nullable=True),
        sa.Column('support_needed', sa.String(length=50), nullable=False, server_default='No'),
        sa.Column('support_description', sa.Text(), nullable=True),
        sa.Column('remarks', sa.Text(), nullable=True),
        sa.Column('is_submitted', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
    )

    op.create_table(
        'eod_reports',
        sa.Column('id', sa.Integer(), primary_key=True, nullable=False),
        sa.Column('created_by', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('created_by_name', sa.String(length=255), nullable=False),
        sa.Column('report_date', sa.DateTime(), nullable=False),
        sa.Column('sales_executive', sa.String(length=255), nullable=True),
        sa.Column('email', sa.String(length=255), nullable=True),
        sa.Column('number_of_calls', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('meetings_held', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('key_clients_spoken', sa.Text(), nullable=True),
        sa.Column('deals_moved_next_stage', sa.Text(), nullable=True),
        sa.Column('challenges_faced', sa.Text(), nullable=True),
        sa.Column('learnings_today', sa.Text(), nullable=True),
        sa.Column('remarks', sa.Text(), nullable=True),
        sa.Column('daily_score', sa.Float(), nullable=False, server_default='70'),
        sa.Column('is_submitted', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
    )

    op.create_table(
        'wod_reports',
        sa.Column('id', sa.Integer(), primary_key=True, nullable=False),
        sa.Column('created_by', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('created_by_name', sa.String(length=255), nullable=False),
        sa.Column('week_start', sa.Date(), nullable=False),
        sa.Column('week_end', sa.Date(), nullable=False),
        sa.Column('sales_executive', sa.String(length=255), nullable=True),
        sa.Column('email', sa.String(length=255), nullable=True),
        sa.Column('weekly_target', sa.Text(), nullable=True),
        sa.Column('achieved', sa.Text(), nullable=True),
        sa.Column('deals_closed', sa.Text(), nullable=True),
        sa.Column('hot_leads_in_pipeline', sa.Text(), nullable=True),
        sa.Column('key_wins_this_week', sa.Text(), nullable=True),
        sa.Column('lost_opportunities', sa.Text(), nullable=True),
        sa.Column('action_plan_next_week', sa.Text(), nullable=True),
        sa.Column('remarks', sa.Text(), nullable=True),
        sa.Column('is_submitted', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
    )


def downgrade() -> None:
    op.drop_table('wod_reports')
    op.drop_table('eod_reports')
    op.drop_table('sod_reports')
