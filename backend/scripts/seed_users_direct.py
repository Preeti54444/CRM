from pathlib import Path
import sys
from datetime import datetime, timezone
import uuid

ROOT = Path(__file__).resolve().parents[1]
sys.path.append(str(ROOT))

from app.database import engine
from app.utils.security import hash_password
from sqlalchemy import text

USERS = [
    {
        'full_name': 'Shree Rathod',
        'email': 'shree.rathod@fundingsathi.in',
        'password': 'shree.admin@2026',
        'role': 'admin',
        'department': 'Sales'
    },
    {
        'full_name': 'Vaibhav Borge',
        'email': 'vaibhav.borge@fundingsathi.in',
        'password': 'vaibhav.emp@01',
        'role': 'employee',
        'department': 'Sales'
    },
    {
        'full_name': 'Saleem K',
        'email': 'saleem.k@fundingsathi.in',
        'password': 'saleem.emp@03',
        'role': 'employee',
        'department': 'Sales'
    },
    {
        'full_name': 'R Chavan',
        'email': 'r.chavan@fundingsathi.in',
        'password': 'roshan.emp@02',
        'role': 'employee',
        'department': 'Sales'
    }
]

INSERT_SQL = text('''
INSERT INTO users (id, full_name, email, password_hash, role, department, status, created_at, updated_at)
VALUES (:id, :full_name, :email, :password_hash, :role, :department, 'active', now(), now())
ON CONFLICT (email) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  password_hash = EXCLUDED.password_hash,
  role = EXCLUDED.role,
  department = EXCLUDED.department,
  updated_at = now();
''')

with engine.connect() as conn:
    for u in USERS:
        try:
            hid = hash_password(u['password'])
            conn.execute(INSERT_SQL, {
                'id': str(uuid.uuid4()),
                'full_name': u['full_name'],
                'email': u['email'].lower().strip(),
                'password_hash': hid,
                'role': u['role'],
                'department': u['department']
            })
            conn.commit()
            print('Seeded:', u['email'])
        except Exception as e:
            print('Failed to seed', u['email'], e)

# Show count
from sqlalchemy import text as _text
with engine.connect() as conn:
    res = conn.execute(_text('SELECT count(*) FROM users'))
    print('Users now:', res.scalar())
