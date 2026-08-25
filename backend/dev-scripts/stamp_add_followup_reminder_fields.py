from dotenv import load_dotenv
from sqlalchemy import create_engine, text
import os

load_dotenv('.env')
url = os.getenv('DATABASE_URL')
if not url:
    raise SystemExit('DATABASE_URL not found in .env')

engine = create_engine(url)
with engine.begin() as conn:
    rows = conn.execute(text("SELECT version_num FROM alembic_version ORDER BY version_num")).fetchall()
    print('BEFORE:', [r[0] for r in rows])
    if conn.execute(text("SELECT 1 FROM alembic_version WHERE version_num='add_followup_reminder_fields'")).fetchone() is None:
        conn.execute(text("INSERT INTO alembic_version (version_num) VALUES ('add_followup_reminder_fields')"))
        print('STAMPED add_followup_reminder_fields')
    else:
        print('ALREADY STAMPED add_followup_reminder_fields')
    rows = conn.execute(text("SELECT version_num FROM alembic_version ORDER BY version_num")).fetchall()
    print('AFTER:', [r[0] for r in rows])
