from app.database import engine
from sqlalchemy import text

with engine.connect() as conn:
    result = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name = 'lender_products'"))
    columns = [row[0] for row in result]
    print("Columns in lender_products table:")
    for col in columns:
        print(f"  - {col}")
