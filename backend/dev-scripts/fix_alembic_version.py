from dotenv import load_dotenv
from sqlalchemy import create_engine, text
import os

load_dotenv('.env')
url = os.getenv('DATABASE_URL')
if not url:
    raise SystemExit('DATABASE_URL not found in .env')

print('DATABASE_URL=', url)
engine = create_engine(url)
with engine.begin() as conn:
    rows = conn.execute(text("SELECT version_num FROM alembic_version ORDER BY version_num")).fetchall()
    print('BEFORE:', [r[0] for r in rows])
    conn.execute(text("DELETE FROM alembic_version WHERE version_num = '20260717_business_qual'"))
    rows = conn.execute(text("SELECT version_num FROM alembic_version ORDER BY version_num")).fetchall()
    print('AFTER:', [r[0] for r in rows])
