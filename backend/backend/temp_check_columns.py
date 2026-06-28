import psycopg2
conn = psycopg2.connect(dbname='fundingsathicrm', user='fundingsathicrm', password='fundingsathicrm', host='localhost', port=5432)
cur = conn.cursor()
cur.execute("SELECT column_name, data_type FROM information_schema.columns WHERE table_name='leads' ORDER BY ordinal_position")
for row in cur.fetchall():
    print(row)
cur.close(); conn.close()
