import os
from dotenv import load_dotenv
from datetime import datetime
from uuid import uuid4
import psycopg2
from psycopg2.extras import execute_values
from app.utils.security import hash_password

load_dotenv('.env')
dsn = os.getenv('DATABASE_URL')
print('DSN', dsn)
conn = psycopg2.connect(dsn)
cur = conn.cursor()
email = 'admin@fundingsathi.com'
full_name = 'Admin User'
password = 'Admin@1234'
password_hash = hash_password(password)
role = 'Admin'
status = 'active'
created_at = datetime.utcnow()
updated_at = datetime.utcnow()

cur.execute("SELECT id FROM users WHERE email=%s", (email,))
if cur.fetchone():
    print('User already exists:', email)
else:
    cur.execute(
        "INSERT INTO users (id, full_name, email, mobile, password_hash, role, department, status, created_at, updated_at) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)",
        (str(uuid4()), full_name, email, None, password_hash, role, None, status, created_at, updated_at)
    )
    conn.commit()
    print('Seeded user:', email, 'password:', password)
cur.close()
conn.close()
