import psycopg2
conn = psycopg2.connect(dbname='fundingsathicrm', user='fundingsathicrm', password='fundingsathicrm', host='localhost', port=5432)
conn.close()
print('NEW_USER_CONNECT_OK')
