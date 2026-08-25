"""Manually apply pipeline migration"""
from app.database import engine
from sqlalchemy import text

print("Applying pipeline migration...")

with engine.connect() as conn:
    # Add pipeline_stage column to leads table
    try:
        conn.execute(text("""
            ALTER TABLE leads 
            ADD COLUMN IF NOT EXISTS pipeline_stage VARCHAR(100)
        """))
        conn.execute(text("""
            UPDATE leads 
            SET pipeline_stage = 'New Leads' 
            WHERE pipeline_stage IS NULL
        """))
        print("[OK] Added pipeline_stage column to leads table")
    except Exception as e:
        print(f"[ERROR] Error adding pipeline_stage column: {e}")
    
    # Create pipeline_configurations table
    try:
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS pipeline_configurations (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                lead_status VARCHAR(100) NOT NULL UNIQUE,
                pipeline_stage VARCHAR(100) NOT NULL,
                stage_order INTEGER NOT NULL DEFAULT 0,
                is_active BOOLEAN NOT NULL DEFAULT true,
                allowed_transitions TEXT,
                description TEXT,
                created_at TIMESTAMP NOT NULL DEFAULT now(),
                updated_at TIMESTAMP NOT NULL DEFAULT now()
            )
        """))
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS ix_pipeline_configurations_lead_status 
            ON pipeline_configurations(lead_status)
        """))
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS ix_pipeline_configurations_id 
            ON pipeline_configurations(id)
        """))
        print("[OK] Created pipeline_configurations table")
    except Exception as e:
        print(f"[ERROR] Error creating pipeline_configurations table: {e}")
    
    # Create pipeline_transition_audits table
    try:
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS pipeline_transition_audits (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                lead_id INTEGER NOT NULL,
                previous_status VARCHAR(100),
                new_status VARCHAR(100) NOT NULL,
                previous_pipeline_stage VARCHAR(100),
                new_pipeline_stage VARCHAR(100) NOT NULL,
                changed_by UUID NOT NULL,
                changed_by_name VARCHAR(255),
                remarks TEXT,
                transition_type VARCHAR(50) NOT NULL DEFAULT 'automatic',
                created_at TIMESTAMP NOT NULL DEFAULT now(),
                FOREIGN KEY (lead_id) REFERENCES leads(id),
                FOREIGN KEY (changed_by) REFERENCES users(id)
            )
        """))
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS ix_pipeline_transition_audits_lead_id 
            ON pipeline_transition_audits(lead_id)
        """))
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS ix_pipeline_transition_audits_id 
            ON pipeline_transition_audits(id)
        """))
        print("[OK] Created pipeline_transition_audits table")
    except Exception as e:
        print(f"[ERROR] Error creating pipeline_transition_audits table: {e}")
    
    conn.commit()

print("Pipeline migration completed!")
