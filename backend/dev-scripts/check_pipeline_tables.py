"""Check if pipeline tables exist"""
from app.database import engine
from sqlalchemy import inspect, text

inspector = inspect(engine)

# Check if pipeline tables exist
tables = inspector.get_table_names()
print(f"Total tables: {len(tables)}")
print(f"pipeline_configurations exists: {'pipeline_configurations' in tables}")
print(f"pipeline_transition_audits exists: {'pipeline_transition_audits' in tables}")

# Check if pipeline_stage column exists in leads table
if 'leads' in tables:
    columns = [col['name'] for col in inspector.get_columns('leads')]
    print(f"pipeline_stage column in leads: {'pipeline_stage' in columns}")
    print(f"Leads table columns: {columns}")
else:
    print("leads table not found")
