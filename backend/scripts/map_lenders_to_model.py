from pathlib import Path
import re
import json
import os

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

EXCEL_IMPORT_TABLE = 'lenders_raw'

try:
    import sys
    sys.path.insert(0, os.getcwd())
    from lender_models import Lender, ensure_lender_schema
    from db import engine as db_engine
except Exception:
    from lender_models import Lender, ensure_lender_schema
    DATABASE_URL = os.environ.get('DATABASE_URL', 'sqlite:///./crm.db')
    db_engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False} if DATABASE_URL.startswith('sqlite') else {})


def parse_money(text):
    if not text:
        return None
    s = str(text).lower().replace(',', '').replace('₹', '').strip()
    m = re.search(r'([0-9]+(?:\.[0-9]+)?)', s)
    if not m:
        return None
    val = float(m.group(1))
    # crude unit handling
    if 'crore' in s or 'cr' in s:
        return val * 10000000
    if 'lakh' in s or 'lac' in s or 'lacs' in s:
        return val * 100000
    if 'k' in s and val < 1000:
        return val * 1000
    return val


def parse_range(text):
    if not text:
        return None, None
    s = str(text).lower()
    parts = re.split(r'[-–—]| to |\s+to\s+', s)
    if len(parts) == 2:
        return parse_money(parts[0]), parse_money(parts[1])
    v = parse_money(s)
    return v, v


def slugify(name: str) -> str:
    s = (name or '').strip().lower()
    s = re.sub(r'[^a-z0-9]+', '-', s)
    s = re.sub(r'-+', '-', s).strip('-')
    return s


def map_row_to_lender(row: dict) -> dict:
    name = row.get('lender_name') or row.get('name') or 'unknown'
    ticket_min, ticket_max = parse_range(row.get('loan_amount_range'))
    min_turn = parse_money(row.get('minimum_turnover'))
    try:
        min_cibil = int(re.search(r'(\d{3})', str(row.get('minimum_cibil_credit_score') or '')).group(1))
    except Exception:
        min_cibil = None

    products = []
    if row.get('product_name'):
        products = [p.strip() for p in re.split(r'[;,/|\\]', str(row.get('product_name'))) if p.strip()]

    eligible = []
    if row.get('preferred_industry'):
        eligible = [p.strip() for p in re.split(r'[;,/|\\]', str(row.get('preferred_industry'))) if p.strip()]

    payload = {
        'name': name,
        'slug': slugify(name),
        'logo': None,
        'min_turnover': min_turn,
        'max_loan': ticket_max,
        'min_cibil': min_cibil,
        'roi': row.get('roi_interest_rate') or row.get('roi'),
        'products': products,
        'eligible_types': eligible,
        'ticket_min': ticket_min or 0,
        'ticket_max': ticket_max or 0,
        'min_vintage': None,
        'processing_fee': None,
        'active_status': True,
        'extra': row,
    }
    return payload


def main():
    Session = sessionmaker(bind=db_engine)
    session = Session()
    # ensure lenders table
    ensure_lender_schema(db_engine)

    # fetch rows from lenders_raw
    from sqlalchemy import text
    with db_engine.connect() as conn:
        res = conn.execute(text("SELECT * FROM lenders_raw"))
        rows = [dict(r) for r in res.mappings().all()]

    created = 0
    updated = 0
    for row in rows:
        payload = map_row_to_lender(row)
        existing = session.query(Lender).filter_by(name=payload['name']).first()
        if existing:
            for k, v in payload.items():
                setattr(existing, k, v)
            updated += 1
        else:
            session.add(Lender(**payload))
            created += 1

    session.commit()
    session.close()
    print(f'Created {created}, updated {updated} lenders')


if __name__ == '__main__':
    main()
