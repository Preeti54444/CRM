import psycopg2
from datetime import datetime
from uuid import uuid4

conn = psycopg2.connect(
    dbname='fundingsathicrm',
    user='fundingsathicrm', 
    password='fundingsathicrm',
    host='localhost',
    port=5432
)
cur = conn.cursor()

users = [
    {
        'email': 'shree.rathod@fundingsathi.in',
        'full_name': 'Shree Rathod',
        'password_hash': '$2b$12$a5JgZSJRugCpr7bhk/PSmOpyFXDahq9uTdqOqtkwqLc/00/98dhsK',
        'role': 'admin',
        'department': 'Sales',
    },
    {
        'email': 'vaibhav.borge@fundingsathi.in',
        'full_name': 'Vaibhav Borge',
        'password_hash': '$2b$12$K/wd1dSv07k8JpXxFlhWQO4v4oOBz8WD9EkHu6cVqxnzrVExUESqW',
        'role': 'Employee',
        'department': 'Sales',
    },
    {
        'email': 'saleem.k@fundingsathi.in',
        'full_name': 'Saleem Khan',
        'password_hash': '$2b$12$X8ohK/6NqiYgP7j/Nd2GxuqMhWOE0h48fJ2ZEXGUJ9/1nlMBFaj1G',
        'role': 'Employee',
        'department': 'Sales',
    },
    {
        'email': 'roshan.chavan@fundingsathi.in',
        'full_name': 'Roshan Chavan',
        'password_hash': '$2b$12$UpM1pfavPDR1dwjL.3D8EuwjYpORv1FzTj7McQGMR5/jKZPbKkSfa',
        'role': 'Employee',
        'department': 'Sales',
    },
    {
        'email': 'corporate@fundingsathi.in',
        'full_name': 'Corporate User',
        'password_hash': '$2b$12$G7vLz/t6B8uY6K6tF4u0YuZ7D44WqlxEBP5k9mbk1AxpYKQ3fjWzW',
        'role': 'Employee',
        'department': 'Corporate',
    },
]

for user in users:
    cur.execute('SELECT id FROM users WHERE email = %s', (user['email'],))
    existing = cur.fetchone()
    if existing:
        print(f"User already exists: {user['email']}")
        continue

    cur.execute('''
        INSERT INTO users (id, full_name, email, password_hash, role, department, status, created_at, updated_at)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
    ''', (
        str(uuid4()),
        user['full_name'],
        user['email'],
        user['password_hash'],
        user['role'],
        user['department'],
        'active',
        datetime.utcnow(),
        datetime.utcnow(),
    ))
    print(f"Created user: {user['email']}")

conn.commit()
cur.close()
conn.close()
