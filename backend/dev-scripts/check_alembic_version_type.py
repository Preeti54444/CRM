from dotenv import load_dotenv
from sqlalchemy import create_engine, text
import os

load_dotenv('.env')
url = os.getenv('DATABASE_URL')
if not url:
    raise SystemExit('DATABASE_URL not found in .env')
print('DATABASE_URL=', url)
engine = create_engine(url)
with engine.connect() as conn:
    row = conn.execute(text("SELECT column_name, data_type, character_maximum_length FROM information_schema.columns WHERE table_name='alembic_version' AND column_name='version_num'"))
    print('ALEMBIC_VERSION_COLUMN=', row.fetchall())
    row2 = conn.execute(text("SELECT version_num FROM alembic_version ORDER BY version_num"))
    print('ALEMBIC_VERSION_ROWS=', [r[0] for r in row2.fetchall()])
