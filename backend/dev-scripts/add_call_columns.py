from sqlalchemy import create_engine, text
from configparser import ConfigParser
import os

# Try to read DB URL from alembic.ini
config_path = os.path.join(os.path.dirname(__file__), 'alembic.ini')
DB_URL = None
if os.path.exists(config_path):
    cfg = ConfigParser()
    cfg.read(config_path)
    try:
        DB_URL = cfg.get('alembic', 'sqlalchemy.url')
    except Exception:
        DB_URL = None

# Fallback: environment variable
if not DB_URL:
    DB_URL = os.environ.get('DATABASE_URL')

if not DB_URL:
    raise SystemExit('No database URL found. Set DATABASE_URL or ensure alembic.ini has sqlalchemy.url')

engine = create_engine(DB_URL, future=True)

sqls = [
    "ALTER TABLE call_data ADD COLUMN IF NOT EXISTS sale_executive VARCHAR(255);",
    "ALTER TABLE call_data ADD COLUMN IF NOT EXISTS product VARCHAR(255);",
    "ALTER TABLE call_data ADD COLUMN IF NOT EXISTS source VARCHAR(255);",
]

with engine.begin() as conn:
    for s in sqls:
        conn.execute(text(s))

print('Columns added (or already existed).')
