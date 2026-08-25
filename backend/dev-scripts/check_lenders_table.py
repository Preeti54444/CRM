from app.database import engine
from sqlalchemy import text

with engine.connect() as conn:
    result = conn.execute(text("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'lenders' ORDER BY ordinal_position"))
    columns = result.fetchall()
    print("Lenders table columns:")
    for col in columns:
        print(f"  - {col[0]} ({col[1]})")
