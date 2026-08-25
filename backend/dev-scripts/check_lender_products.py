from app.database import engine
from sqlalchemy import text

conn = engine.connect()

# Check lender_products table
result = conn.execute(text('SELECT COUNT(*) FROM lender_products'))
total_products = result.fetchone()[0]
print(f'Total lender products: {total_products}')

# Get unique lenders from lender_products
result = conn.execute(text('SELECT COUNT(DISTINCT lender_name) FROM lender_products'))
unique_lenders = result.fetchone()[0]
print(f'Unique lenders in lender_products: {unique_lenders}')

# Get all unique lender names from lender_products
result = conn.execute(text('SELECT DISTINCT lender_name FROM lender_products ORDER BY lender_name'))
print('\nUnique lenders from lender_products table:')
print('-' * 80)
for row in result:
    print(f'  {row[0]}')

conn.close()
