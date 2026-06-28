import psycopg2

conn = psycopg2.connect(dbname='fundingsathicrm', user='fundingsathicrm', password='fundingsathicrm', host='localhost', port=5432)
cur = conn.cursor()

# Get all tables
cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'")
tables = cur.fetchall()
print('Tables in database:')
for table in tables:
    print(' -', table[0])

cur.close()
conn.close()
