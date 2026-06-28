#!/usr/bin/env python
"""Check lead assignments."""
from app.database import SessionLocal
from sqlalchemy import text

db = SessionLocal()

# Get admin user ID
admin_result = db.execute(text("SELECT id, full_name, email FROM users WHERE role = 'admin' LIMIT 1")).fetchone()
if admin_result:
    admin_id, admin_name, admin_email = admin_result
    print(f'Admin User: {admin_name} ({admin_email})')
    print(f'Admin ID: {admin_id}\n')
    
    # Check how many leads are assigned to this admin
    assigned_count = db.execute(text(f"SELECT COUNT(*) FROM leads WHERE assigned_to = '{admin_id}'")).scalar()
    print(f'Leads assigned to admin: {assigned_count}')
else:
    print('No admin user found')

# Check distribution of lead assignments
result = db.execute(text('''
    SELECT assigned_to, COUNT(*) as count
    FROM leads
    WHERE assigned_to IS NOT NULL
    GROUP BY assigned_to
    ORDER BY count DESC
    LIMIT 10
'''))

print('\nLead assignment distribution:')
for row in result:
    assigned_to, count = row[0], row[1]
    print(f'  User {assigned_to}: {count} leads')

# Check unassigned leads
unassigned = db.execute(text('SELECT COUNT(*) FROM leads WHERE assigned_to IS NULL')).scalar()
print(f'\nUnassigned leads: {unassigned}')

# Show a few unassigned leads
print('\nSample unassigned leads:')
result = db.execute(text('''
    SELECT id, lead_name, company_name, email
    FROM leads
    WHERE assigned_to IS NULL
    ORDER BY id DESC
    LIMIT 5
'''))
for row in result:
    print(f'  ID: {row[0]}, Name: {row[1]}, Company: {row[2]}, Email: {row[3]}')

db.close()
