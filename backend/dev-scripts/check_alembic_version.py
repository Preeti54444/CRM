import os
from dotenv import load_dotenv
import psycopg2

load_dotenv('.env')
dsn = os.getenv('DATABASE_URL')
print('DSN', dsn)
conn = psycopg2.connect(dsn)
cur = conn.cursor()
cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name")
print('tables:', [row[0] for row in cur.fetchall()])
cur.execute("SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='alembic_version')")
alembic_exists = cur.fetchone()[0]
print('alembic_version exists:', alembic_exists)
if alembic_exists:
    cur.execute("SELECT column_name, data_type, character_maximum_length FROM information_schema.columns WHERE table_name='alembic_version'")
    print('alembic_version columns:', cur.fetchall())
    cur.execute("SELECT version_num FROM alembic_version")
    print('alembic_version rows:', cur.fetchall())
cur.close()
conn.close()
