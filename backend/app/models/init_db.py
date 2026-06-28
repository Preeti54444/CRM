"""Database Initialization and Schema Creation"""
import sys
from sqlalchemy import text
from ..database import engine, Base
from . import (
    sod_report,
    eod_report,
    wod_report,
    loan_application,
    lender_query,
    call,
    contact,
    notification_event,
    work_session,
    activity_log,
)


def check_tables():
    """Check if all tables exist"""
    try:
        inspector_query = """
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
        """
        with engine.connect() as conn:
            result = conn.execute(text(inspector_query))
            tables = [row[0] for row in result]
            print(f"Found {len(tables)} tables:")
            for table in sorted(tables):
                print(f"  - {table}")
            return tables
    except Exception as e:
        print(f"Error checking tables: {e}")
        return []


def drop_all_tables():
    """Drop all tables (careful!)"""
    print("WARNING: This will delete all data!")
    response = input("Are you sure? Type 'yes' to confirm: ")
    if response.lower() == "yes":
        try:
            Base.metadata.drop_all(bind=engine)
            print("✓ All tables dropped")
            return True
        except Exception as e:
            print(f"✗ Error dropping tables: {e}")
            return False
    else:
        print("Cancelled")
        return False


if __name__ == "__main__":
    if len(sys.argv) > 1:
        command = sys.argv[1]
        if command == "init":
            init_db()
        elif command == "check":
            check_tables()
        elif command == "drop":
            drop_all_tables()
        else:
            print("Usage: python init_db.py [init|check|drop]")
    else:
        init_db()
        check_tables()
