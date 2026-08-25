import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app.database import SessionLocal
from app.models.task import Task
import json
s = SessionLocal()
rows = s.query(Task).order_by(Task.created_at.desc()).limit(10).all()
out = []
for r in rows:
    out.append({
        'id': r.id,
        'title': r.title,
        'assigned_to': str(r.assigned_to) if r.assigned_to else None,
        'assigned_by': str(r.assigned_by) if r.assigned_by else None,
        'status': r.status,
        'due_date': r.due_date.isoformat() if r.due_date else None,
        'created_at': r.created_at.isoformat() if r.created_at else None,
    })
print(json.dumps(out, indent=2))
