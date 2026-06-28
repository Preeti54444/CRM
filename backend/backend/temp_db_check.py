import os
from dotenv import load_dotenv
load_dotenv('.env')
import psycopg2

dsn = os.getenv('DATABASE_URL')
print('DSN', dsn)
conn = psycopg2.connect(dsn)
cur = conn.cursor()
tables = ['sod_reports','eod_reports','wod_reports','daily_reports','users','leads','tasks','notifications']
for tbl in tables:
    cur.execute('SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema=%s AND table_name=%s)', ('public', tbl))
    print(tbl, cur.fetchone()[0])
cur.execute('SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema=%s AND table_name=%s)', ('public', 'alembic_version'))
exists = cur.fetchone()[0]
print('alembic_version', exists)
if exists:
    cur.execute('SELECT version_num FROM alembic_version')
    print('alembic_version_version', cur.fetchone())
cur.close()
conn.close()
