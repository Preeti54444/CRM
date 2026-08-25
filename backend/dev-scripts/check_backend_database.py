from app.config import settings
from app.database import engine
from sqlalchemy import text

print("Backend Database Configuration:")
print("=" * 80)
print(f"DATABASE_URL: {settings.database_url}")
print(f"Environment: {settings.environment}")
print()

# Test connection
try:
    with engine.connect() as conn:
        result = conn.execute(text("SELECT current_database()"))
        db_name = result.scalar()
        print(f"Connected to database: {db_name}")
        
        # Check if lenders table exists
        result = conn.execute(text("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'lenders'
            )
        """))
        lenders_exists = result.scalar()
        print(f"Lenders table exists: {lenders_exists}")
        
        if lenders_exists:
            count = conn.execute(text("SELECT COUNT(*) FROM lenders")).scalar()
            print(f"Lenders count: {count}")
            
            # Sample lender data
            sample = conn.execute(text("SELECT name, products FROM lenders LIMIT 1")).fetchone()
            if sample:
                print(f"Sample lender: {sample[0]}")
                print(f"Products: {sample[1]}")
except Exception as e:
    print(f"Error: {e}")
    print(f"Engine URL: {engine.url}")

print("=" * 80)
