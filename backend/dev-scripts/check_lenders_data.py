from app.database import engine
from sqlalchemy import text

with engine.connect() as conn:
    result = conn.execute(text("SELECT id, name, active_status FROM lenders LIMIT 5"))
    lenders = result.fetchall()
    print("Sample lenders in database:")
    for lender in lenders:
        print(f"  ID: {lender[0]}, Name: {lender[1]}, Active: {lender[2]}")
    
    count_result = conn.execute(text("SELECT COUNT(*) FROM lenders"))
    total = count_result.scalar()
    print(f"\nTotal lenders in database: {total}")
