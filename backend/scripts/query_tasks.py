import sqlite3, os, json

db = r'c:\Users\rohan\Downloads\CRM-fixed (2)\\CRM-fixed\\crm_fixed\\backend\\crm.db'
print('DB exists:', os.path.exists(db))
if not os.path.exists(db):
    raise SystemExit('DB not found')
conn = sqlite3.connect(db)
cur = conn.cursor()
cur.execute('SELECT id,title,description,assigned_to,assigned_by,priority,due_date,status,created_at FROM tasks ORDER BY created_at DESC LIMIT 20')
rows = cur.fetchall()
print(json.dumps([list(r) for r in rows], default=str, ensure_ascii=False, indent=2))
conn.close()
