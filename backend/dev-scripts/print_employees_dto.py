import sys
import os

# Ensure backend package is importable when running this script directly
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from app.database import SessionLocal
from app.routers.admin_employees import EmployeeActivityDTO
from app.models.user import User
import json


def main():
    db = SessionLocal()
    try:
        users = db.query(User).filter(User.role != 'Admin').all()
        result = [EmployeeActivityDTO(u, db).to_dict() for u in users]
        print(json.dumps(result, default=str, indent=2))
    finally:
        db.close()

if __name__ == '__main__':
    main()
