from app.database import engine
from sqlalchemy import text

conn = engine.connect()

# Get total count
result = conn.execute(text('SELECT COUNT(*) FROM lenders'))
total = result.fetchone()[0]
print(f'Total lenders in database: {total}')

# Get all lenders
result = conn.execute(text('SELECT id, name, slug, active_status FROM lenders ORDER BY id'))
print('\nAll lenders:')
print('-' * 80)
for row in result:
    print(f'ID: {row[0]:3d} | Name: {row[1]:30s} | Slug: {row[2]:20s} | Active: {row[3]}')

conn.close()
