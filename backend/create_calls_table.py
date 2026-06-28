import sys
import os
from pathlib import Path

# Add the backend directory to the path
backend_dir = Path(__file__).resolve().parent
sys.path.insert(0, str(backend_dir))

from app.database import engine, Base
from app.models import user, lead, call

# Create the calls table with all dependencies
print("Creating calls table with dependencies...")
Base.metadata.create_all(bind=engine, tables=[call.Call.__table__])
print("Calls table created successfully!")
