from app.database import engine
from sqlalchemy import text

conn = engine.connect()

# Get all lender products with details
result = conn.execute(text('''
SELECT 
    lp.id,
    lp.lender_name,
    lp.product_name,
    lp.loan_amount,
    lp.roi,
    lp.eligible_types
FROM lender_products lp
ORDER BY lp.lender_name, lp.product_name
'''))

print('All 25 Lender Products:')
print('=' * 100)
for row in result:
    print(f'ID: {row[0]:2d} | Lender: {row[1]:25s} | Product: {row[2]:30s} | Amount: {row[3]:15s} | ROI: {row[4]:10s}')

conn.close()
