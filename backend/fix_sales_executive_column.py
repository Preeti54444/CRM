"""
Fix missing sales_executive column in leads table
"""
import sys
from pathlib import Path

# Add backend to path
backend_path = Path(__file__).parent
sys.path.insert(0, str(backend_path))

def fix_missing_columns():
    """Check and add missing columns to leads table"""
    print("\n" + "=" * 80)
    print("FIXING MISSING LEADS TABLE COLUMNS")
    print("=" * 80)
    
    try:
        from app.database import engine
        from sqlalchemy import inspect, text
        
        # Get current columns in leads table
        inspector = inspect(engine)
        columns = [col['name'] for col in inspector.get_columns('leads')]
        
        print(f"\n📋 Current columns in leads table ({len(columns)} total):")
        for col in sorted(columns):
            print(f"   - {col}")
        
        # Check for missing columns
        required_columns = [
            'sales_executive',
            'location',
            'date_of_entry',
            'gst_number',
            'pan_number',
            'entity_type',
            'annual_turnover',
            'business_vintage',
            'number_of_employees',
            'year_of_incorporation',
            'registered_office_address',
            'business_description',
            'industry',
            'promoter_cibil_score',
            'npa_history',
            'guarantee_available',
            'current_ratio',
            'interest_coverage_ratio',
            'dscr',
            'date_of_first_call',
            'purpose_of_call',
            'product_service_discussed',
            'call_outcome',
            'current_status',
            'final_outcome',
            'lead_stage',
            'last_activity_date',
            'proposal_shared',
            'next_followup_date',
            'followup_time',
            'followup_type',
            'followup_note',
            'learning_challenge',
        ]
        
        missing_columns = [col for col in required_columns if col not in columns]
        
        if not missing_columns:
            print(f"\n✓ All required columns exist!")
            return True
        
        print(f"\n⚠ Missing columns ({len(missing_columns)}):")
        for col in missing_columns:
            print(f"   - {col}")
        
        # Add missing columns
        print(f"\n⏳ Adding missing columns...")
        
        with engine.begin() as conn:
            for col in missing_columns:
                try:
                    if col == 'sales_executive':
                        conn.execute(text("ALTER TABLE leads ADD COLUMN sales_executive VARCHAR(255)"))
                    elif col == 'location':
                        conn.execute(text("ALTER TABLE leads ADD COLUMN location VARCHAR(255)"))
                    elif col == 'date_of_entry':
                        conn.execute(text("ALTER TABLE leads ADD COLUMN date_of_entry DATE"))
                    elif col in ['gst_number', 'pan_number', 'entity_type', 'annual_turnover', 'business_vintage']:
                        conn.execute(text(f"ALTER TABLE leads ADD COLUMN {col} VARCHAR(100)"))
                    elif col in ['number_of_employees', 'year_of_incorporation']:
                        conn.execute(text(f"ALTER TABLE leads ADD COLUMN {col} INTEGER"))
                    elif col in ['registered_office_address', 'business_description', 'followup_note', 'learning_challenge']:
                        conn.execute(text(f"ALTER TABLE leads ADD COLUMN {col} TEXT"))
                    elif col in ['industry', 'promoter_cibil_score', 'npa_history', 'guarantee_available', 'current_ratio', 'interest_coverage_ratio', 'dscr']:
                        conn.execute(text(f"ALTER TABLE leads ADD COLUMN {col} VARCHAR(100)"))
                    elif col in ['date_of_first_call', 'next_followup_date', 'last_activity_date']:
                        conn.execute(text(f"ALTER TABLE leads ADD COLUMN {col} DATE"))
                    elif col in ['purpose_of_call', 'call_outcome', 'followup_type', 'current_status', 'final_outcome', 'lead_stage', 'proposal_shared']:
                        conn.execute(text(f"ALTER TABLE leads ADD COLUMN {col} VARCHAR(100)"))
                    elif col == 'followup_time':
                        conn.execute(text("ALTER TABLE leads ADD COLUMN followup_time TIME"))
                    elif col in ['product_service_discussed']:
                        conn.execute(text(f"ALTER TABLE leads ADD COLUMN {col} VARCHAR(255)"))
                    print(f"   ✓ Added {col}")
                except Exception as e:
                    print(f"   ✗ Failed to add {col}: {e}")
        
        print(f"\n✓ Column fix complete!")
        return True
        
    except Exception as e:
        print(f"\n✗ Error: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = fix_missing_columns()
    sys.exit(0 if success else 1)
