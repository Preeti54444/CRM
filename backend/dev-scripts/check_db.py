import sqlite3

conn = sqlite3.connect('crm.db')
cursor = conn.cursor()

# Get all tables
cursor.execute('SELECT name FROM sqlite_master WHERE type="table"')
tables = [row[0] for row in cursor.fetchall()]
print('Tables:', tables)

# Check lenders table
if 'lenders' in tables:
    cursor.execute('SELECT COUNT(*) FROM lenders')
    print('Lenders count:', cursor.fetchone()[0])
    
    cursor.execute('SELECT id, name, active_status FROM lenders')
    lenders = cursor.fetchall()
    print('Lenders details:')
    for lender in lenders:
        print(f'  ID: {lender[0]}, Name: {lender[1]}, Active: {lender[2]}')

# Check lender_products table
if 'lender_products' in tables:
    cursor.execute('SELECT COUNT(*) FROM lender_products')
    print('Lender products count:', cursor.fetchone()[0])

conn.close()
