import os
import sys
import dotenv
from sqlalchemy import create_engine, text

sys.path.append(os.getcwd())

dotenv.load_dotenv('.env')
url = os.getenv('DATABASE_URL')
engine = create_engine(url)
with engine.connect() as conn:
    rows = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='leads' ORDER BY ordinal_position")).fetchall()
    print([r[0] for r in rows])

from app.database import SessionLocal
from app.models.lead import Lead

with SessionLocal() as db:
    print('lead_count', db.query(Lead).count())
