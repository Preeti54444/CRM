"""
Print total number of rows in leads table.
"""
import sys, os
sys.path.insert(0, os.getcwd())
from app.database import engine
from sqlalchemy import text

with engine.connect() as conn:
    r = conn.execute(text('SELECT COUNT(*) FROM leads'))
    c = r.scalar()
    print('Leads count =', c)
