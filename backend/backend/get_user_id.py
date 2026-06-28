import psycopg2

conn = psycopg2.connect(dbname='fundingsathicrm', user='fundingsathicrm', password='fundingsathicrm', host='localhost', port=5432)
cur = conn.cursor()

# Get user info
cur.execute('SELECT id, email, full_name, role FROM users WHERE email = %s', ('shree.rathod@fundingsathi.in',))
user = cur.fetchone()
if user:
    print('User found:')
    print('  ID:', user[0])
    print('  Email:', user[1])
    print('  Name:', user[2])
    print('  Role:', user[3])
else:
    print('User not found')

cur.close()
conn.close()
