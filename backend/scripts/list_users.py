import sys
from pathlib import Path

# Ensure backend package imports work when running from scripts folder
ROOT = Path(__file__).resolve().parents[1]
sys.path.append(str(ROOT))

from app.database import SessionLocal
from app.models.user import User


def main():
    db = SessionLocal()
    try:
        users = db.query(User).all()
        print('Users in DB:', len(users))
        for u in users:
            print(u.email, getattr(u,'full_name',None), getattr(u,'role',None))
    finally:
        db.close()


if __name__ == '__main__':
    main()
