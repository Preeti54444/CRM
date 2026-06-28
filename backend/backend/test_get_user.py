import sys
sys.path.insert(0, '/root/app')

from app.database import SessionLocal
from app.services.user_service import get_user_by_id
from uuid import UUID

# Create a session
db = SessionLocal()

# Try to get the user
user_id = UUID('4ca56983-6b5d-4bc8-ab3c-57548ac862f3')
user = get_user_by_id(db, user_id)

if user:
    print('User found:')
    print('  ID:', user.id)
    print('  Email:', user.email)
    print('  Name:', user.full_name)
    print('  Role:', user.role)
else:
    print('User not found')

db.close()
