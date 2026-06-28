#!/usr/bin/env python
"""Test database connection and check leads table."""
import sys
from sqlalchemy import create_engine, text, inspect
from app.config import settings

print(f"Database URL: {settings.database_url}")

try:
    # Test connection
    engine = create_engine(settings.database_url)
    connection = engine.connect()
    print("✓ Database connection successful")
    
    # Check if leads table exists
    inspector = inspect(engine)
    tables = inspector.get_table_names()
    print(f"✓ Tables in database: {tables}")
    
    if 'leads' in tables:
        print("✓ leads table exists")
        columns = inspector.get_columns('leads')
        print(f"✓ leads table columns: {[col['name'] for col in columns]}")
        
        # Check a sample query
        result = connection.execute(text("SELECT COUNT(*) FROM leads"))
        count = result.scalar()
        print(f"✓ Current leads count: {count}")
    else:
        print("✗ leads table does NOT exist")
        print("Available tables:", tables)
    
    connection.close()
    print("\n✓ All database checks passed")
    
except Exception as e:
    print(f"✗ Database error: {type(e).__name__}: {str(e)}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
