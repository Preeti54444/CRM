import sys
sys.path.insert(0, '.')
from app.main import app
from app.config import settings
import psycopg2
import psycopg2.extras

print('DATABASE_URL=', settings.database_url)
print('Loaded routes:')
for route in sorted(app.routes, key=lambda r: (getattr(r, 'path', ''), str(getattr(r, 'methods', '')))):
    print(route.path, getattr(route, 'methods', None))

conn = psycopg2.connect(settings.database_url)
cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name")
print('DB tables:', [r['table_name'] for r in cur.fetchall()])
for tbl in ['users','leads','daily_reports','notifications','notification_events','eod_reports','wod_reports','followups','tasks','customer_profiles','lender_cases']:
    cur.execute('SELECT count(*) AS cnt FROM information_schema.tables WHERE table_schema=%s AND table_name=%s', ('public', tbl))
    exists = cur.fetchone()['cnt'] > 0
    if exists:
        cur.execute(f'SELECT count(*) FROM {tbl}')
        print(tbl, 'exists, rows=', cur.fetchone()[0])
    else:
        print(tbl, 'missing')
cur.execute("SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_name='alembic_version'")
print('alembic_version exists', cur.fetchone()[0] > 0)
try:
    cur.execute('SELECT version_num FROM alembic_version')
    print('alembic_version row:', cur.fetchone()[0])
except Exception as e:
    print('alembic_version query failed', repr(e))
cur.close(); conn.close()
