import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from passlib.context import CryptContext
from app.models.user import User
import uuid

# Database connection - use environment variable or default to Docker service
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:fundingsathicrm@postgres:5432/fundingsathicrm")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def create_admin_user():
    db = SessionLocal()
    try:
        # Check if admin user already exists
        existing_user = db.query(User).filter(User.email == "shree.rathod@fundingsathi.in").first()
        if existing_user:
            print(f"Admin user already exists: {existing_user.email}")
            return
        
        # Create admin user
        admin_user = User(
            id=uuid.uuid4(),
            full_name="Shree Rathod",
            email="shree.rathod@fundingsathi.in",
            mobile="",
            password_hash=pwd_context.hash("Shree.Admin@2026"),
            role="Admin",
            department="Management",
            status="active"
        )
        
        db.add(admin_user)
        db.commit()
        print(f"Admin user created successfully: {admin_user.email}")
        
    except Exception as e:
        db.rollback()
        print(f"Error creating admin user: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    create_admin_user()
