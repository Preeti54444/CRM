from app.database import engine
from sqlalchemy import text

with engine.connect() as conn:
    # Check all tables in database
    result = conn.execute(text("""
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
        ORDER BY table_name
    """))
    
    tables = [row[0] for row in result.fetchall()]
    
    print("Tables in database:")
    for table in tables:
        print(f"  - {table}")
    
    print(f"\nTotal tables: {len(tables)}")
    
    # Check if lenders table exists
    if 'lenders' in tables:
        print("\n✓ lenders table exists")
        
        # Check lenders table structure
        columns = conn.execute(text("""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'lenders'
            ORDER BY ordinal_position
        """)).fetchall()
        
        print("\nLenders table columns:")
        for col in columns:
            print(f"  {col[0]}: {col[1]}")
        
        # Count lenders
        count = conn.execute(text("SELECT COUNT(*) FROM lenders")).scalar()
        print(f"\nLenders count: {count}")
    else:
        print("\n✗ lenders table does NOT exist")
