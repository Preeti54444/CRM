from pathlib import Path
from urllib.parse import urlparse
from sqlalchemy import create_engine, text

p = Path.cwd()
text_data = (p/'.env').read_text(encoding='utf-8')
env = {}
for line in text_data.splitlines():
    if not line.strip() or line.strip().startswith('#'):
        continue
    if '=' not in line:
        continue
    k, v = line.split('=', 1)
    env[k.strip()] = v.strip().strip('"').strip("'")

print('DATABASE_URL=', env.get('DATABASE_URL'))
url = urlparse(env['DATABASE_URL'])
engine = create_engine(env['DATABASE_URL'])
with engine.connect() as conn:
    for q, label in [
        ("SELECT id, lead_id, status, request_reason, requester_name, created_at FROM lead_interested_requests ORDER BY created_at DESC LIMIT 5", 'INTERESTS'),
        ("SELECT id, lead_id, status, request_reason, requester_name, created_at FROM lead_takeover_requests ORDER BY created_at DESC LIMIT 5", 'TAKEOVERS'),
    ]:
        print(label)
        res = conn.execute(text(q))
        for row in res:
            try:
                print(dict(row._mapping))
            except AttributeError:
                print({k: row[k] for k in row.keys()})
