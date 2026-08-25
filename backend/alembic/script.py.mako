"""SQLAlchemy Mako migration script template."""

from alembic import op
import sqlalchemy as sa


revision = '${up_revision}'
down_revision = ${down_revision}
branch_labels = ${branch_labels}
depends_on = ${depends_on}


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
