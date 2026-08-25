from dotenv import load_dotenv
from sqlalchemy import create_engine, text
import os

load_dotenv('.env')
url = os.getenv('DATABASE_URL')
if not url:
    raise SystemExit('DATABASE_URL not found in .env')
engine = create_engine(url)
with engine.connect() as conn:
    rows = conn.execute(text('SELECT version_num FROM alembic_version ORDER BY version_num')).fetchall()
    print([r[0] for r in rows])
