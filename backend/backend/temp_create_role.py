import psycopg2
conn = psycopg2.connect(dbname="postgres", user="postgres", password="fundingsathicrm", host="localhost", port=5432)
conn.autocommit = True
cur = conn.cursor()
cur.execute("SELECT rolname FROM pg_roles WHERE rolname='fundingsathicrm'")
print('ROLE', cur.fetchone())
cur.execute("CREATE ROLE fundingsathicrm WITH LOGIN PASSWORD 'fundingsathicrm'")
cur.execute("GRANT ALL PRIVILEGES ON DATABASE fundingsathicrm TO fundingsathicrm")
cur.execute("ALTER DATABASE fundingsathicrm OWNER TO fundingsathicrm")
cur.close()
conn.close()
print('OK')
