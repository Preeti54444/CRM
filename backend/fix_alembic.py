import psycopg2
url='postgresql://postgres:fundingsathicrm@187.127.149.245:5432/fundingsathicrm'
conn=psycopg2.connect(url)
cur=conn.cursor()
cur.execute('ALTER TABLE alembic_version ALTER COLUMN version_num TYPE varchar(255);')
conn.commit()
print('OK')
cur.close()
conn.close()
