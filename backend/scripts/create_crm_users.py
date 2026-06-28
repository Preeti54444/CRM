from pathlib import Path
import sys
import uuid
from datetime import datetime
ROOT = Path(__file__).resolve().parents[1]
sys.path.append(str(ROOT))

from app.database import engine
from app.utils.security import hash_password
from sqlalchemy import text

# Users from frontend login.html
users_to_create = [
    {
        'email': 'shree.rathod@fundingsathi.in',
        'password': 'shree.admin@2026',
        'full_name': 'Shree Rathod',
        'role': 'admin',
        'status': 'active'
    },
    {
        'email': 'vaibhav.borge@fundingsathi.in',
        'password': 'vaibhav.emp@01',
        'full_name': 'Vaibhav Borge',
        'role': 'employee',
        'status': 'active'
    },
    {
        'email': 'saleem.k@fundingsathi.in',
        'password': 'saleem.emp@03',
        'full_name': 'Saleem Khan',
        'role': 'employee',
        'status': 'active'
    },
    {
        'email': 'roshan.chavan@fundingsathi.in',
        'password': 'roshan.emp@02',
        'full_name': 'Roshan Chavan',
        'role': 'employee',
        'status': 'active'
    },
    {
        'email': 'corporate@fundingsathi.in',
        'password': 'emp789',
        'full_name': 'Corporate User',
        'role': 'employee',
        'status': 'active'
    }
]

with engine.connect() as conn:
    # First check existing users
    existing = conn.execute(text('SELECT email, full_name, role FROM users'))
    print('Existing users:')
    for row in existing:
        print(f'  {row.email} - {row.full_name} ({row.role})')
    
    print('\nCreating users...')
    for user_data in users_to_create:
        uid = str(uuid.uuid4())
        password_hash = hash_password(user_data['password'])
        
        # Check if user already exists
        existing_user = conn.execute(
            text('SELECT id FROM users WHERE LOWER(email) = :email'),
            {'email': user_data['email'].lower()}
        ).first()
        
        if existing_user:
            print(f'  User {user_data["email"]} already exists, updating password...')
            conn.execute(
                text('UPDATE users SET password_hash = :password_hash, updated_at = now() WHERE LOWER(email) = :email'),
                {'password_hash': password_hash, 'email': user_data['email'].lower()}
            )
        else:
            print(f'  Creating user {user_data["email"]}...')
            conn.execute(
                text("""
                    INSERT INTO users (id, full_name, email, password_hash, role, status, created_at, updated_at)
                    VALUES (:id, :full_name, :email, :password_hash, :role, :status, now(), now())
                """),
                {
                    'id': uid,
                    'full_name': user_data['full_name'],
                    'email': user_data['email'].lower(),
                    'password_hash': password_hash,
                    'role': user_data['role'],
                    'status': user_data['status']
                }
            )
    
    conn.commit()
    
    # Verify users
    print('\nUsers after creation:')
    result = conn.execute(text('SELECT email, full_name, role FROM users ORDER BY email'))
    for row in result:
        print(f'  {row.email} - {row.full_name} ({row.role})')
    
    count = conn.execute(text('SELECT count(*) FROM users')).scalar()
    print(f'\nTotal users: {count}')
