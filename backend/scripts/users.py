"""Create four backend users with predefined credentials.

Usage:
    py -3 scripts/users.py

The script adds these accounts if they do not already exist by email:
- shree.rathod@fundingsathi.in  / shree.admin@2026  (admin)
- vaibhav.borge@fundingsathi.in / vaibhav.emp@01  (employee)
- saleem.k@fundingsathi.in / saleem.emp@03  (employee)
- r.chavan@fundingsathi.in / roshan.emp@02  (employee)
"""
from __future__ import annotations
import sys
from datetime import datetime
from pathlib import Path
from uuid import uuid4

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from sqlalchemy import func
from app.database import SessionLocal
from app.models.user import User
from app.utils.security import hash_password

USERS = [
    {
        'full_name': 'Shree Rathod',
        'email': 'shree.rathod@fundingsathi.in',
        'password': 'shree.admin@2026',
        'role': 'admin',
    },
    {
        'full_name': 'Vaibhav Borge',
        'email': 'vaibhav.borge@fundingsathi.in',
        'password': 'vaibhav.emp@01',
        'role': 'employee',
    },
    {
        'full_name': 'Saleem Khan',
        'email': 'saleem.k@fundingsathi.in',
        'password': 'saleem.emp@03',
        'role': 'employee',
    },
    {
        'full_name': 'Roshan Chavan',
        'email': 'r.chavan@fundingsathi.in',
        'password': 'roshan.emp@02',
        'role': 'employee',
    },
]


def main() -> None:
    db = SessionLocal()
    try:
        created = 0
        skipped = 0
        for user_data in USERS:
            email = user_data['email'].strip().lower()
            existing = db.query(User).filter(func.lower(User.email) == email).first()
            if existing:
                print(f"Skipping existing user: {email}")
                skipped += 1
                continue

            user = User(
                id=uuid4(),
                full_name=user_data['full_name'],
                email=email,
                mobile=None,
                password_hash=hash_password(user_data['password']),
                role=user_data['role'],
                department=None,
                status='active',
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            )
            db.add(user)
            created += 1
            print(f"Created user: {email} ({user_data['role']})")

        if created > 0:
            db.commit()
            print(f"Committed {created} new users.")
        else:
            print("No new users were created.")
        print(f"Skipped {skipped} already-existing users.")
    finally:
        db.close()


if __name__ == '__main__':
    main()
