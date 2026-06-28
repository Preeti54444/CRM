import sys
import os
sys.path.insert(0, '.')
from app.config import settings
import psycopg2
import psycopg2.extras

conn = psycopg2.connect(settings.database_url)
cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
cur.execute('SELECT current_database() AS db, current_schema() AS schema, current_setting(\'search_path\') AS search_path')
print(cur.fetchone())
cur.execute("SELECT schema_name FROM information_schema.schemata ORDER BY schema_name")
print('schemas=', [r['schema_name'] for r in cur.fetchall()])
cur.execute("SELECT table_schema, table_name FROM information_schema.tables WHERE table_type='BASE TABLE' ORDER BY table_schema, table_name")
for row in cur.fetchall():
    print(row['table_schema'], row['table_name'])
cur.close(); conn.close()
