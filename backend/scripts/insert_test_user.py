from pathlib import Path
import sys
import uuid
from datetime import datetime
ROOT = Path(__file__).resolve().parents[1]
sys.path.append(str(ROOT))

from app.database import engine
from sqlalchemy import text

uid = str(uuid.uuid4())
stmt = text("""
INSERT INTO users (id, full_name, email, password_hash, role, status, created_at, updated_at)
VALUES (:id, :full_name, :email, :password_hash, :role, :status, now(), now())
""")

with engine.connect() as conn:
    try:
        conn.execute(stmt, {
            'id': uid,
            'full_name': 'Test User',
            'email': 'test.user@example.com',
            'password_hash': 'testhash',
            'role': 'employee',
            'status': 'active'
        })
        conn.commit()
        print('Inserted user id', uid)
    except Exception as e:
        print('Insert failed:', e)

with engine.connect() as conn:
    res = conn.execute(text('SELECT count(*) FROM users'))
    print('count after insert:', res.scalar())
