import sys
import os
from datetime import datetime, timedelta, time
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app.database import SessionLocal
from app.models.user import User
from app.models.task import Task

s = SessionLocal()

# Use known employee and admin UUIDs from DB (observed earlier)
assigned_to = '96c3c872-6778-4d70-9ce4-90e1fa4982d7'
assigned_by = 'f1d124c5-1a1f-4c65-9d6d-860641f6654a'

due = datetime.combine((datetime.utcnow() + timedelta(days=1)).date(), time(hour=17, minute=0))

t = Task(
    title='Please review your new sales targets (simulated)',
    description='This task was created by an automated test to simulate admin target assignment.',
    assigned_to=assigned_to,
    assigned_by=assigned_by,
    priority='high',
    due_date=due,
    status='pending',
)

s.add(t)
s.commit()
print('Created task id:', t.id)
