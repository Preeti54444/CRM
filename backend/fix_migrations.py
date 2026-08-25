import psycopg2

try:
    conn = psycopg2.connect(
        dbname='fundingsathicrm',
        user='postgres',
        password='fundingsathicrm',
        host='187.127.149.245'
    )
    cur = conn.cursor()
    # Clear corrupt migration entry
    cur.execute("DELETE FROM alembic_version")
    conn.commit()
    cur.close()
    conn.close()
    print("✓ Database migration table cleared")
except Exception as e:
    print(f"Note: {e}")
