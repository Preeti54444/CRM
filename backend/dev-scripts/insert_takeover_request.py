from pathlib import Path
import sys
ROOT = Path(__file__).resolve().parents[1]
sys.path.append(str(ROOT))

from sqlalchemy import text
from app.database import engine

lead_id = 30
requester_email = 'saleem.k@fundingsathi.in'
request_reason = 'Requesting takeover for testing'

with engine.begin() as conn:
    user = conn.execute(text('SELECT id, full_name FROM users WHERE LOWER(email) = :email'), {'email': requester_email.lower()}).first()
    if not user:
        print('Requester not found:', requester_email)
        raise SystemExit(1)
    requester_id = user.id
    requester_name = user.full_name
    print('Requester:', requester_id, requester_name)

    # Insert takeover request
    res = conn.execute(text('''
        INSERT INTO lead_takeover_requests (lead_id, status, request_reason, requester_id, requester_name, requested_at, created_at, updated_at)
        VALUES (:lead_id, 'pending', :request_reason, :requester_id, :requester_name, now(), now(), now())
        RETURNING id
    '''), {
        'lead_id': lead_id,
        'request_reason': request_reason,
        'requester_id': requester_id,
        'requester_name': requester_name
    })
    row = res.fetchone()
    if row:
        print('Inserted takeover request id:', row.id)
    else:
        print('Insert failed')
