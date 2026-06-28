import psycopg2
conn = psycopg2.connect(dbname='postgres', user='postgres', password='fundingsathicrm', host='localhost', port=5432)
conn.autocommit = True
cur = conn.cursor()
cur.execute("SELECT pid FROM pg_stat_activity WHERE datname='fundingsathicrm' AND pid <> pg_backend_pid();")
for pid_row in cur.fetchall():
    pid = pid_row[0]
    print('terminating', pid)
    cur.execute('SELECT pg_terminate_backend(%s)', (pid,))
cur.execute('DROP DATABASE IF EXISTS fundingsathicrm')
cur.execute('CREATE DATABASE fundingsathicrm OWNER fundingsathicrm')
cur.close()
conn.close()
print('DB_RESET_OK')
