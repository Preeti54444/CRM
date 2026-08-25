import os
from dotenv import load_dotenv
import psycopg2

load_dotenv('.env')
dsn = os.getenv('DATABASE_URL')
print('DSN', dsn)
conn = psycopg2.connect(dsn)
cur = conn.cursor()
cur.execute("CREATE TABLE IF NOT EXISTS alembic_version (version_num VARCHAR(255) NOT NULL PRIMARY KEY);")
conn.commit()
cur.close()
conn.close()
print('created alembic_version table with VARCHAR(255)')
