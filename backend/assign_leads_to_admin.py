#!/usr/bin/env python
"""Assign unassigned leads to admin user."""
from app.database import SessionLocal, engine
from sqlalchemy import text

db = SessionLocal()

# Get admin user
admin_result = db.execute(text("SELECT id FROM users WHERE role = 'admin' LIMIT 1")).fetchone()
if not admin_result:
    print("No admin user found!")
    db.close()
    exit(1)

admin_id = admin_result[0]
print(f"Admin ID: {admin_id}")

# Get count of unassigned leads
unassigned = db.execute(text("SELECT COUNT(*) FROM leads WHERE assigned_to IS NULL")).scalar()
print(f"Unassigned leads: {unassigned}")

# Assign all unassigned leads to admin
with engine.begin() as conn:
    result = conn.execute(text(f"UPDATE leads SET assigned_to = '{admin_id}' WHERE assigned_to IS NULL"))
    updated = result.rowcount
    print(f"Assigned {updated} leads to admin")

# Verify
db = SessionLocal()
assigned_count = db.execute(text(f"SELECT COUNT(*) FROM leads WHERE assigned_to = '{admin_id}'")).scalar()
print(f"\nFinal: {assigned_count} leads assigned to admin")

db.close()
print("✓ Done! Refresh the CRM to see the leads.")
