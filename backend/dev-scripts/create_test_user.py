"""Create a test user for pipeline testing"""
from app.database import SessionLocal
from app.models.user import User
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

db = SessionLocal()
try:
    # Check if test user already exists
    existing = db.query(User).filter(User.email == "test@pipeline.com").first()
    if existing:
        print("Test user already exists")
        print(f"Email: test@pipeline.com")
        print(f"Password: test123")
    else:
        # Create test user
        test_user = User(
            email="test@pipeline.com",
            full_name="Pipeline Test User",
            password_hash=pwd_context.hash("test123"),
            role="Admin",
            mobile="9876543210"
        )
        db.add(test_user)
        db.commit()
        print("Test user created successfully")
        print(f"Email: test@pipeline.com")
        print(f"Password: test123")
        print(f"Role: Admin")
finally:
    db.close()
