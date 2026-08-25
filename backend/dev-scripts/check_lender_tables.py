from app.database import engine
from sqlalchemy import text

with engine.connect() as conn:
    result = conn.execute(text("SELECT table_name FROM information_schema.tables WHERE table_name LIKE '%lender%'"))
    tables = [row[0] for row in result]
    print("Lender-related tables:")
    for table in tables:
        print(f"  - {table}")
