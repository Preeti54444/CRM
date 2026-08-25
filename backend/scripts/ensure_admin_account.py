from datetime import datetime
from uuid import UUID

from sqlalchemy import func

from app.database import SessionLocal
from app.models.user import User

TARGET_ID = UUID('f1d124c5-1a1f-4c65-9d6d-860641f6654a')
TARGET_EMAIL = 'shree.rathod@fundingsathi.in'
PASSWORD_HASH = '$2b$12$Z2DY4pqo9nMcC9yUTJf/R.NskdDPKsZAvzVHoo/yQECkeawNoCIzm'


def main():
    db = SessionLocal()
    try:
        existing = db.query(User).filter((User.id == TARGET_ID) | (func.lower(User.email) == TARGET_EMAIL.lower())).first()
        if existing is None:
            existing = User(
                id=TARGET_ID,
                full_name='Shree Rathod',
                email=TARGET_EMAIL,
                mobile='',
                password_hash=PASSWORD_HASH,
                role='Admin',
                department='',
                status='active',
                created_at=datetime(2026, 7, 18, 5, 26, 59, 158444),
                updated_at=datetime(2026, 7, 18, 5, 26, 59, 158493),
            )
            db.add(existing)
            print('CREATED')
        else:
            existing.full_name = 'Shree Rathod'
            existing.email = TARGET_EMAIL.lower()
            existing.mobile = ''
            existing.password_hash = PASSWORD_HASH
            existing.role = 'Admin'
            existing.department = ''
            existing.status = 'active'
            existing.updated_at = datetime(2026, 7, 18, 5, 26, 59, 158493)
            if existing.created_at is None:
                existing.created_at = datetime(2026, 7, 18, 5, 26, 59, 158444)
            print('UPDATED')

        db.commit()
        db.refresh(existing)
        print('RESULT', str(existing.id), existing.email, existing.role, existing.status, existing.full_name)
    finally:
        db.close()


if __name__ == '__main__':
    main()
