from pathlib import Path
import os, sys, csv, re, json

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))

from app.database import engine
from sqlalchemy import text

OUT = Path('scripts') / 'reports' / 'auto_assign_results.csv'
OUT.parent.mkdir(parents=True, exist_ok=True)

def normalize(s):
    if not s:
        return None
    return re.sub(r'\s+', ' ', str(s).strip()).lower()

def is_email(s):
    return s and '@' in s

conn = engine.connect()
assigned = []
manual = []
try:
    q = text("SELECT r.id, r.data, r.lead_id FROM lead_import_raw r LEFT JOIN leads l ON l.id = r.lead_id WHERE (r.data->> 'Sales Executive ' IS NOT NULL OR r.data->> 'Sales Executive' IS NOT NULL) AND (l.assigned_to IS NULL)")
    rows = conn.execute(q).mappings().all()
    for row in rows:
        raw_id = row['id']
        lead_id = row['lead_id']
        data = row['data'] or '{}'
        try:
            parsed = json.loads(data)
        except Exception:
            parsed = {}
        se = parsed.get('Sales Executive') or parsed.get('Sales Executive ')
        se_norm = normalize(se)
        if not se_norm:
            manual.append((raw_id, lead_id, se))
            continue

        user_id = None
        if is_email(se_norm):
            r2 = conn.execute(text('SELECT id FROM users WHERE lower(email)=:e LIMIT 1'), {'e': se_norm}).fetchone()
            if r2:
                user_id = str(r2[0])
            else:
                # try username part
                uname = se_norm.split('@', 1)[0]
                r2 = conn.execute(text('SELECT id FROM users WHERE lower(email) LIKE :u LIMIT 1'), {'u': f"%{uname}%"}).fetchone()
                if r2:
                    user_id = str(r2[0])
        else:
            # try exact match first
            r2 = conn.execute(text('SELECT id FROM users WHERE lower(full_name)=:n LIMIT 1'), {'n': se_norm}).fetchone()
            if r2:
                user_id = str(r2[0])
            else:
                # try partial match
                r2 = conn.execute(text('SELECT id FROM users WHERE lower(full_name) LIKE :p LIMIT 1'), {'p': f"%{se_norm}%"}).fetchone()
                if r2:
                    user_id = str(r2[0])

        if user_id:
            conn.execute(text('UPDATE leads SET assigned_to = :uid WHERE id = :lid'), {'uid': user_id, 'lid': lead_id})
            assigned.append((raw_id, lead_id, se, user_id))
        else:
            manual.append((raw_id, lead_id, se))

    # write results
    with open(OUT, 'w', newline='', encoding='utf-8') as f:
        w = csv.writer(f)
        w.writerow(['raw_id','lead_id','sales_exec','assigned_to_user_id_or_blank'])
        for a in assigned:
            w.writerow([a[0], a[1], a[2], a[3]])
        for m in manual:
            w.writerow([m[0], m[1], m[2], ''])

    print('Auto-assign complete. Results written to', OUT)
finally:
    conn.close()
