import psycopg2

HOST = '187.127.149.245'
PORT = 5432
USER = 'postgres'
PASSWORD = 'fundingsathicrm'
DBNAME = 'fundingsathicrm'

print('Connecting to', HOST)
conn = psycopg2.connect(host=HOST, port=PORT, user=USER, password=PASSWORD, dbname=DBNAME)
cur = conn.cursor()
cur.execute("SELECT current_database(), current_schema();")
print('DB/SCH:', cur.fetchone())
cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name;")
tables = [row[0] for row in cur.fetchall()]
print('TABLE COUNT:', len(tables))
print('FIRST TABLES:', tables[:20])
cur.close()
conn.close()
