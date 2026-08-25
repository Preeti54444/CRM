from sqlalchemy import create_engine, text
from pathlib import Path
import os
from db import engine

print('using db', engine.url)
with engine.connect() as conn:
    result = conn.execute(text('SELECT count(*) FROM lenders'))
    print('lender count', result.scalar())
    result = conn.execute(text('SELECT id,name,slug,ticket_min,ticket_max,min_turnover,min_cibil,products,eligible_types FROM lenders ORDER BY id LIMIT 20'))
    for row in result:
        print(row)
