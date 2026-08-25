import psycopg2

HOST = '187.127.149.245'
PORT = 5432
DBNAME = 'fundingsathicrm'
TESTS = [
    ('postgres', 'fundingsathicrm'),
    ('fundingsathicrm', 'fundingsathicrm'),
]

for user, password in TESTS:
    try:
        conn = psycopg2.connect(host=HOST, port=PORT, dbname=DBNAME, user=user, password=password)
        conn.close()
        print(f'CONNECTED user={user} host={HOST}:{PORT} db={DBNAME}')
    except Exception as exc:
        print(f'FAILED user={user}: {exc}')
