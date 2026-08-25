from dotenv import load_dotenv
from sqlalchemy import create_engine, text
import os

load_dotenv('.env')
url = os.getenv('DATABASE_URL')
if not url:
    raise SystemExit('DATABASE_URL not found in .env')

engine = create_engine(url)
with engine.connect() as conn:
    cols = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='followups' ORDER BY ordinal_position")).fetchall()
    print('FOLLOWUPS_COLUMNS=', [c[0] for c in cols])
    if 'followup_time' in [c[0] for c in cols] and 'next_followup_time' in [c[0] for c in cols] and 'reminder_sent' in [c[0] for c in cols] and 'followup_completed' in [c[0] for c in cols]:
        print('FOLLOWUP_MIGRATION_COLUMNS_PRESENT: True')
    else:
        print('FOLLOWUP_MIGRATION_COLUMNS_PRESENT: False')
