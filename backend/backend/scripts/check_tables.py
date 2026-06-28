import os
import re
import psycopg2
from psycopg2.extras import RealDictCursor

# locate .env in this folder
env_path = os.path.join(os.path.dirname(__file__), '..', '.env')
if not os.path.exists(env_path):
    env_path = os.path.join(os.path.dirname(__file__), '..', '..', '.env')

if not os.path.exists(env_path):
    print('ERROR: backend .env not found at expected locations')
    raise SystemExit(1)

with open(env_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

env = {}
for line in lines:
    line = line.strip()
    if not line or line.startswith('#'):
        continue
    if '=' in line:
        k, v = line.split('=', 1)
        env[k.strip()] = v.strip()

if 'DATABASE_URL' not in env:
    print('ERROR: DATABASE_URL not found in .env')
    raise SystemExit(1)

dsn = env['DATABASE_URL']
print('Using DATABASE_URL:', dsn)

# Connect and list tables
try:
    conn = psycopg2.connect(dsn)
except Exception as e:
    print('ERROR: could not connect to Postgres:', e)
    raise

try:
    cur = conn.cursor(cursor_factory=RealDictCursor)
    cur.execute("""
        SELECT table_schema, table_name
        FROM information_schema.tables
        WHERE table_type='BASE TABLE'
          AND table_schema NOT IN ('pg_catalog','information_schema')
        ORDER BY table_schema, table_name;
    """)
    rows = cur.fetchall()
    tables = [f"{r['table_schema']}.{r['table_name']}" for r in rows]
    print('\nAll tables:')
    for t in tables:
        print(' -', t)
    print('\nTotal tables:', len(tables))

    # Check specific tables (case-insensitive, check without schema too)
    names_to_check = ['users', 'leads', 'reports', 'tasks', 'notifications']
    lower_names = [t.split('.')[-1].lower() for t in tables]
    print('\nTable existence:')
    for name in names_to_check:
        exists = name.lower() in lower_names
        print(f" - {name}: {'FOUND' if exists else 'MISSING'}")

    # Check alembic_version
    cur.execute("SELECT count(*) FROM information_schema.tables WHERE table_name='alembic_version'")
    alembic_count = cur.fetchone()['count']
    print('\nAlembic version table present:', 'YES' if alembic_count and alembic_count > 0 else 'NO')

finally:
    cur.close()
    conn.close()

print('\nDone')
