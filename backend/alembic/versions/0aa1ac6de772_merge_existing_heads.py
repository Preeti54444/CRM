"""SQLAlchemy Mako migration script template."""

from alembic import op
import sqlalchemy as sa


revision = '0aa1ac6de772'
down_revision = ('20260724_add_lead_rating_and_lender_fields', '20260727_add_comprehensive_lead_fields', '20260728_backfill_call_details', '20260725_add_timer_metrics_table')
branch_labels = None
depends_on = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
