from pathlib import Path
import re
import json

from lender_models import Lender, Base
from db import engine, SessionLocal
from lender_models import ensure_lender_schema

EXCEL_PATH = Path(r"C:\Users\Sneha\Downloads\Lenders_SCF_Products (2).xlsx")

UNIT_FACTORS = {
    'crore': 10_000_000,
    'cr': 10_000_000,
    'lakh': 100_000,
    'lakhs': 100_000,
    'lacs': 100_000,
    'lac': 100_000,
    'thousand': 1_000,
    'k': 1_000,
}


def parse_money(value):
    if value is None:
        return None
    text = str(value).strip()
    if not text:
        return None
    normalized = text.replace(',', '').lower()
    normalized = normalized.replace('₹', '').replace('inr', '').strip()
    normalized = normalized.replace('+', '').replace('upto', '').replace('up to', '').replace('approx', '').strip()
    if normalized in {'na', 'n/a', 'not specified', 'not applicable', '-'}:
        return None
    match = re.search(r'([0-9]+(?:\.[0-9]+)?)', normalized)
    if not match:
        return None
    amount = float(match.group(1))
    for token, factor in UNIT_FACTORS.items():
        if token in normalized:
            return amount * factor
    return amount


def parse_range(value):
    if value is None:
        return 0.0, 0.0
    text = str(value).strip().lower()
    if not text or text in {'na', 'n/a', 'not specified', 'not applicable', '-'}:
        return 0.0, 0.0

    clean = text.replace('upto', '').replace('up to', '').replace('+', '').replace('approx', '').strip()
    parts = re.split(r'[-–—]| to |\s+to\s+', clean)
    if len(parts) == 2:
        return parse_money(parts[0]) or 0.0, parse_money(parts[1]) or 0.0

    amount = parse_money(clean) or 0.0
    if text.startswith('upto') or text.startswith('up to'):
        return 0.0, amount
    if '+' in str(value):
        return amount, 0.0
    return amount, amount


def parse_years(value):
    if value is None:
        return None
    text = str(value).strip().lower()
    match = re.search(r'([0-9]+)', text)
    if match:
        return int(match.group(1))
    return None


def parse_percentage(value):
    if value is None:
        return None
    text = str(value).strip().lower()
    if not text or text in {'na', 'n/a', 'not specified', 'not applicable', '-'}:
        return None
    match = re.search(r'([0-9]+(?:\.[0-9]+)?)', text)
    if match:
        return float(match.group(1))
    return None


def parse_cibil(value):
    if value is None:
        return None
    text = str(value)
    match = re.search(r'(\d{3})', text)
    if match:
        return int(match.group(1))
    return None


def normalize_text(value):
    if value is None:
        return None
    text = str(value).strip()
    return text if text else None


def slugify(value):
    text = normalize_text(value) or ''
    text = text.lower()
    text = re.sub(r'&', 'and', text)
    text = re.sub(r'[^a-z0-9]+', '-', text)
    text = re.sub(r'-{2,}', '-', text)
    return text.strip('-')


def split_list_field(value):
    text = normalize_text(value)
    if not text:
        return []
    parts = re.split(r'[;,/\\|]', text)
    return [part.strip() for part in parts if part.strip()]


def aggregate_lender_rows(rows, headers):
    lenders = {}
    for raw_row in rows:
        record = dict(zip(headers, raw_row))
        name = normalize_text(record.get('Lender Name') or record.get('name') or record.get('lender_name') or record.get('bank_name'))
        if not name:
            continue

        if name not in lenders:
            lenders[name] = {
                'name': name,
                'slug': slugify(name),
                'min_turnover': None,
                'ticket_min': None,
                'ticket_max': None,
                'min_cibil': None,
                'min_vintage': None,
                'processing_fee': None,
                'roi': None,
                'products': set(),
                'eligible_types': set(),
                'average_approval_days': None,
                'average_disbursement_days': None,
                'historical_approval_rate': None,
                'active_status': True,
                'extra': {'programs': []},
            }

        lender = lenders[name]
        loan_range = normalize_text(record.get('Loan Amount Range'))
        min_ticket, max_ticket = parse_range(loan_range)
        if min_ticket is not None:
            lender['ticket_min'] = min([v for v in [lender['ticket_min'], min_ticket] if v is not None] or [min_ticket])
        if max_ticket is not None and max_ticket > 0:
            lender['ticket_max'] = max([v for v in [lender['ticket_max'], max_ticket] if v is not None] or [max_ticket])

        turnover = parse_money(record.get('Minimum Turnover'))
        if turnover is not None:
            lender['min_turnover'] = min([v for v in [lender['min_turnover'], turnover] if v is not None] or [turnover])

        cibil = parse_cibil(record.get('Minimum CIBIL / Credit Score'))
        if cibil is not None:
            lender['min_cibil'] = min([v for v in [lender['min_cibil'], cibil] if v is not None] or [cibil])

        vintage = parse_years(record.get('Business Vintage'))
        if vintage is not None:
            lender['min_vintage'] = min([v for v in [lender['min_vintage'], vintage] if v is not None] or [vintage])

        fee = parse_percentage(record.get('Processing Fee'))
        if fee is not None:
            lender['processing_fee'] = min([v for v in [lender['processing_fee'], fee] if v is not None] or [fee])

        roi = normalize_text(record.get('ROI/Interest Rate'))
        if roi and not lender['roi']:
            lender['roi'] = roi

        lender['products'].update(split_list_field(record.get('Product Name')))
        lender['eligible_types'].update(split_list_field(record.get('Preferred Industry')))
        if not lender['eligible_types']:
            lender['eligible_types'].update(split_list_field(record.get('Product Category')))

        lender['extra']['programs'].append({
            'product_name': normalize_text(record.get('Product Name')),
            'loan_amount_range': loan_range,
            'roi': normalize_text(record.get('ROI/Interest Rate')),
            'tenure': normalize_text(record.get('Tenure')),
            'minimum_turnover': normalize_text(record.get('Minimum Turnover')),
            'business_vintage': normalize_text(record.get('Business Vintage')),
            'processing_fee': normalize_text(record.get('Processing Fee')),
            'key_features': normalize_text(record.get('Key Features')),
            'eligibility_criteria': normalize_text(record.get('Key Eligibility Criteria')),
            'product_category': normalize_text(record.get('Product Category')),
            'sub_product': normalize_text(record.get('Sub-Product')),
            'locations_working_in': normalize_text(record.get('Locations Working In')),
            'preferred_industry': normalize_text(record.get('Preferred Industry')),
            'negative_industries': normalize_text(record.get('Negative Industries')),
            'minimum_credit_rating': normalize_text(record.get('Minimum Credit Rating Grade (BBB- & Above)')),
            'security_collateral': normalize_text(record.get('Primary Security / Collateral')),
            'guarantee_requirement': normalize_text(record.get('Guarantee Requirement')),
        })

    return lenders


if __name__ == '__main__':
    import openpyxl

    if not EXCEL_PATH.exists():
        raise SystemExit(f'Excel file not found: {EXCEL_PATH}')

    wb = openpyxl.load_workbook(EXCEL_PATH, data_only=True)
    sheet = wb.active
    rows = list(sheet.iter_rows(values_only=True))
    if not rows:
        raise SystemExit('Excel workbook is empty')

    headers = [str(col).strip() if col is not None else '' for col in rows[0]]
    aggregated = aggregate_lender_rows(rows[1:], headers)

    # Ensure lenders table schema has all expected columns (add missing columns)
    ensure_lender_schema(engine)
    session = SessionLocal()
    created = 0
    updated = 0
    errors = []

    for lender_name, lender_data in aggregated.items():
        payload = {
            'name': lender_data['name'],
            'slug': lender_data['slug'],
            'logo': None,
            'min_turnover': lender_data['min_turnover'],
            'max_loan': lender_data['ticket_max'],
            'min_cibil': lender_data['min_cibil'],
            'roi': lender_data['roi'],
            'products': sorted(lender_data['products']),
            'eligible_types': sorted(lender_data['eligible_types']),
            'ticket_min': lender_data['ticket_min'] or 0.0,
            'ticket_max': lender_data['ticket_max'] or 0.0,
            'min_vintage': lender_data['min_vintage'] or 0,
            'min_dscr': None,
            'requires_atnw_positive': False,
            'requires_owned_property': False,
            'processing_fee': lender_data['processing_fee'] or 0.0,
            'foreclosure_charges': 0.0,
            'hidden_charges': 0.0,
            'security_requirement': None,
            'property_requirement': None,
            'gst': None,
            'pan': None,
            'cin': None,
            'priority_score': 0,
            'sla': None,
            'average_approval_days': lender_data['average_approval_days'],
            'average_disbursement_days': lender_data['average_disbursement_days'],
            'historical_approval_rate': lender_data['historical_approval_rate'],
            'historical_rejection_rate': None,
            'active_status': lender_data['active_status'],
            'extra': lender_data['extra'],
        }

        try:
            existing = session.query(Lender).filter_by(name=payload['name']).first()
            if existing:
                for key, value in payload.items():
                    setattr(existing, key, value)
                updated += 1
            else:
                session.add(Lender(**payload))
                created += 1
        except Exception as exc:
            errors.append({'name': lender_name, 'error': str(exc)})

    try:
        session.commit()
    except Exception as exc:
        session.rollback()
        raise
    finally:
        session.close()

    print('import complete')
    print('lenders imported:', len(aggregated))
    print('created:', created)
    print('updated:', updated)
    if errors:
        print('errors:', json.dumps(errors, indent=2))
