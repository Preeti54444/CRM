import sys, os
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from app.database import SessionLocal
from app.models.user import User


db = SessionLocal()
try:
    admins = db.query(User).filter(User.role.ilike('%admin%')).all()
    for a in admins:
        print(a.id, a.email, a.role, a.status)
finally:
    db.close()
