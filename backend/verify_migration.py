from app.database import engine
from sqlalchemy import text

# Verify follow-up reminder fields were added
with engine.connect() as conn:
    result = conn.execute(text("""
        SELECT column_name, data_type, is_nullable 
        FROM information_schema.columns 
        WHERE table_name = 'followups' 
        AND column_name IN ('followup_time', 'next_followup_time', 'reminder_sent', 'followup_completed')
        ORDER BY column_name
    """))
    
    print("Follow-up reminder fields in database:")
    for row in result:
        print(f"  {row.column_name}: {row.data_type} (nullable: {row.is_nullable})")
    
    # Check indexes
    result = conn.execute(text("""
        SELECT indexname 
        FROM pg_indexes 
        WHERE tablename = 'followups' 
        AND indexname LIKE 'ix_followups%'
        ORDER BY indexname
    """))
    
    print("\nFollow-up indexes in database:")
    for row in result:
        print(f"  {row.indexname}")
