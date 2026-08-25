"""SQLAlchemy Mako migration script template."""

from alembic import op
import sqlalchemy as sa


revision = 'fd786b20cc96'
down_revision = ('20260710_add_call_columns_sale_product_source', '20260712_forecast_module', 'add_lead_followup_and_deal_value', 'add_notification_type', 'add_pipeline_system')
branch_labels = None
depends_on = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
