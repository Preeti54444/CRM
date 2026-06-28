import os
import psycopg2
from psycopg2.extras import RealDictCursor

# Find .env
env_path = os.path.join(os.path.dirname(__file__), '..', '.env')
if not os.path.exists(env_path):
    env_path = os.path.join(os.path.dirname(__file__), '..', '..', '.env')

if not os.path.exists(env_path):
    print('ERROR: backend .env not found')
    raise SystemExit(1)

env = {}
with open(env_path, 'r', encoding='utf-8') as f:
    for line in f:
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
print('Connecting to', dsn)

tables_of_interest = ['users', 'tasks', 'notifications', 'daily_reports']

conn = psycopg2.connect(dsn)
cur = conn.cursor(cursor_factory=RealDictCursor)

try:
    # For each table, print columns
    for tbl in tables_of_interest:
        print('\n' + '='*60)
        print('Table:', tbl)
        print('-'*60)
        cur.execute("""
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns
            WHERE table_schema='public' AND table_name=%s
            ORDER BY ordinal_position
        """, (tbl,))
        cols = cur.fetchall()
        if not cols:
            print('  (table not found)')
            continue
        print('Columns:')
        for c in cols:
            print(f" - {c['column_name']}: {c['data_type']} nullable={c['is_nullable']} default={c['column_default']}")

    # Print foreign keys involving these tables
    print('\n' + '='*60)
    print('Foreign key constraints involving the tables of interest')
    print('-'*60)
    cur.execute("""
        SELECT
          tc.constraint_name,
          tc.table_name AS source_table,
          kcu.column_name AS source_column,
          ccu.table_name AS target_table,
          ccu.column_name AS target_column
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND (tc.table_name = ANY(%s) OR ccu.table_name = ANY(%s))
        ORDER BY tc.table_name, tc.constraint_name
    """, (tables_of_interest, tables_of_interest))
    fks = cur.fetchall()
    if not fks:
        print('  (no foreign keys found involving these tables)')
    else:
        for fk in fks:
            print(f" - {fk['constraint_name']}: {fk['source_table']}.{fk['source_column']} -> {fk['target_table']}.{fk['target_column']}")

    # Also show references TO these tables (incoming fks) and outgoing grouped
    print('\n' + '='*60)
    print('Grouped foreign keys by table')
    print('-'*60)
    # get all FKs in public schema
    cur.execute("""
        SELECT
          tc.constraint_name,
          tc.table_name AS source_table,
          kcu.column_name AS source_column,
          ccu.table_name AS target_table,
          ccu.column_name AS target_column
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema='public'
        ORDER BY tc.table_name, tc.constraint_name
    """)
    allfks = cur.fetchall()
    grouped = {}
    for fk in allfks:
        grouped.setdefault(fk['source_table'], []).append(fk)
    for table, fks in grouped.items():
        print(f"Table {table} has {len(fks)} foreign key(s):")
        for fk in fks:
            print(f"  - {fk['constraint_name']}: {fk['source_table']}.{fk['source_column']} -> {fk['target_table']}.{fk['target_column']}")

finally:
    cur.close()
    conn.close()

print('\nDone')
