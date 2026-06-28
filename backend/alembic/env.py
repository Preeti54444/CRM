from logging.config import fileConfig
import os
import sys
from pathlib import Path

from sqlalchemy import engine_from_config
from sqlalchemy import pool
from dotenv import load_dotenv

from alembic import context

sys.path.append(os.path.dirname(os.path.dirname(__file__)))
from app.database import Base
from app.models import user, lead, task, meeting, notification, customer_profile, followup, timeline, early_logout_request, sod_report, eod_report, wod_report, targets, lender_case, call

alembic_dir = Path(__file__).resolve().parent
backend_env = alembic_dir.parent / '.env'
clean_project_env = alembic_dir.parent.parent / '.env'
workspace_root_env = alembic_dir.parent.parent.parent / '.env'
for env_path in (backend_env, clean_project_env, workspace_root_env):
    if env_path.exists():
        load_dotenv(str(env_path))
        break

config = context.config
fileConfig(config.config_file_name)

database_url = os.getenv("DATABASE_URL") or config.get_main_option("sqlalchemy.url")
if not database_url:
    raise RuntimeError("DATABASE_URL is required for Alembic migrations.")
config.set_main_option("sqlalchemy.url", database_url)

target_metadata = Base.metadata


def run_migrations_offline():
    url = config.get_main_option("sqlalchemy.url")
    context.configure(url=url, target_metadata=target_metadata, literal_binds=True)

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online():
    connectable = engine_from_config(
        config.get_section(config.config_ini_section),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
