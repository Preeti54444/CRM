import sys
sys.path.insert(0, '.')
from app.database import Base
import app.models as models
from app.config import settings
import psycopg2
import psycopg2.extras

print(sorted(Base.metadata.tables.keys()))
for name, table in Base.metadata.tables.items():
    print(name, table.fullname)

conn = psycopg2.connect(settings.database_url)
cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
cur.execute("SELECT table_schema, table_name FROM information_schema.tables WHERE table_schema NOT IN ('pg_catalog','information_schema') ORDER BY table_schema, table_name")
for row in cur.fetchall():
    print(row['table_schema'], row['table_name'])
cur.execute("SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='alembic_version')")
print('ALEMBIC_VERSION_EXISTS', cur.fetchone()[0])
cur.close()
conn.close()
