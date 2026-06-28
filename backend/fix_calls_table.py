from app.database import engine
from sqlalchemy import text

print("Dropping existing call_data table and indexes if they exist...")
with engine.connect() as conn:
    # Drop indexes first
    try:
        conn.execute(text("DROP INDEX IF EXISTS ix_call_data_call_id"))
        print("Dropped ix_call_data_call_id index")
    except Exception as e:
        print(f"Error dropping ix_call_data_call_id: {e}")
    
    try:
        conn.execute(text("DROP INDEX IF EXISTS ix_call_data_id"))
        print("Dropped ix_call_data_id index")
    except Exception as e:
        print(f"Error dropping ix_call_data_id: {e}")
    
    # Drop table
    try:
        conn.execute(text("DROP TABLE IF EXISTS call_data CASCADE"))
        print("Dropped call_data table")
    except Exception as e:
        print(f"Error dropping call_data table: {e}")
    
    conn.commit()

print("Creating call_data table...")
from app.models import user, lead, call
from app.database import Base

Base.metadata.create_all(bind=engine, tables=[call.Call.__table__])
print("Call_data table created successfully!")

# Verify
with engine.connect() as conn:
    result = conn.execute(text("SELECT table_name FROM information_schema.tables WHERE table_name='call_data'"))
    print('Call_data table exists:', result.fetchone() is not None)
