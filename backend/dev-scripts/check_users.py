"""Check existing users in database"""
from app.database import SessionLocal
from app.models.user import User

db = SessionLocal()
try:
    users = db.query(User).all()
    print(f"Total users: {len(users)}")
    print("\nExisting users:")
    for user in users:
        print(f"  - Email: {user.email}, Role: {user.role}, Full Name: {user.full_name}")
finally:
    db.close()
