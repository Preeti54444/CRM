from app.database import engine
from sqlalchemy import text

# Manually add follow-up reminder fields since migration was stamped
with engine.connect() as conn:
    try:
        # Add new columns to followups table
        conn.execute(text("ALTER TABLE followups ADD COLUMN IF NOT EXISTS followup_time TIME"))
        conn.execute(text("ALTER TABLE followups ADD COLUMN IF NOT EXISTS next_followup_time TIME"))
        conn.execute(text("ALTER TABLE followups ADD COLUMN IF NOT EXISTS reminder_sent BOOLEAN DEFAULT false NOT NULL"))
        conn.execute(text("ALTER TABLE followups ADD COLUMN IF NOT EXISTS followup_completed BOOLEAN DEFAULT false NOT NULL"))
        
        # Create indexes
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_followups_lead_id ON followups(lead_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_followups_assigned_to ON followups(assigned_to)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_followups_followup_date ON followups(followup_date)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_followups_followup_time ON followups(followup_time)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_followups_status ON followups(status)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_followups_followup_completed ON followups(followup_completed)"))
        
        conn.commit()
        print("Follow-up reminder fields and indexes added successfully")
    except Exception as e:
        print(f"Error: {e}")
        conn.rollback()
