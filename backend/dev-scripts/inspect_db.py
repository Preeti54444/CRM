import os
from dotenv import load_dotenv
from app.database import engine
from sqlalchemy import text

load_dotenv('.env')

with engine.connect() as conn:
    print('TABLES:')
    tables = [row[0] for row in conn.execute(text("SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name"))]
    print(tables)
    for table in ['users', 'followups', 'leads']:
        if table in tables:
            count = conn.execute(text(f"SELECT COUNT(*) FROM {table}")).scalar()
            print(f"{table}: {count}")
        else:
            print(f"{table}: missing")
