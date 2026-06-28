"""
Import leads from CSV file exported from the Excel workbook.
This script is permissive: it builds `lead_name` from Contact Person, Company, Email, or Mobile
and parses `Location (City, State)` into `city` and `state`.
Usage:
    python scripts/import_leads_from_csv.py tmp/lead_journey.csv
"""
from __future__ import annotations
import sys
import os
import csv
import re
from typing import Dict, Any

# Ensure app package importable
sys.path.insert(0, os.getcwd())

from app.database import SessionLocal
import app.models.user
import app.models.customer_profile
import app.models.timeline
from app.models.lead import Lead
from app.schemas.lead import LeadCreate
from app.services.lead_service import create_lead

# normalization helpers
def norm(h: str) -> str:
    return re.sub(r"\s+", " ", (h or "").strip()).lower()


def parse_location(val: str):
    if not val:
        return None, None
    parts = [p.strip() for p in re.split(r",|\\|/|-", val) if p and p.strip()]
    if len(parts) >= 2:
        return parts[0], parts[1]
    if len(parts) == 1:
        # try split by space last token as state (best-effort)
        toks = parts[0].split()
        if len(toks) >= 2:
            return " ".join(toks[:-1]), toks[-1]
        return parts[0], None
    return None, None


def normalize_mobile(val: str):
    if not val:
        return None
    s = re.sub(r"[^0-9]", "", str(val))
    if len(s) == 0:
        return None
    # if more than 10 digits, take last 10 (country codes present)
    if len(s) > 10:
        s = s[-10:]
    return s


def map_row(headers, row: Dict[str, str]) -> Dict[str, Any]:
    mapped = {}
    # common header keys we expect (normalized)
    # We'll map heuristically
    # lead_name
    contact = row.get('contact person name') or row.get('contact person') or row.get('contact person name ') or row.get('contact person name  ')
    company = row.get('customer company name') or row.get('customer company name  ') or row.get('customer company name')
    email = row.get('email id') or row.get('email address') or row.get('email')
    mobile = row.get('contact number') or row.get('contact no') or row.get('contact number  ')
    # prefer contact person, else company, else email, else mobile
    lead_name = None
    if contact and contact.strip().lower() not in ('none',''):
        lead_name = contact.strip()
    elif company and company.strip().lower() not in ('none',''):
        lead_name = company.strip()
    elif email and email.strip().lower() not in ('none',''):
        lead_name = email.strip()
    elif mobile and mobile.strip().lower() not in ('none',''):
        lead_name = mobile.strip()

    mapped['lead_name'] = lead_name

    # company_name
    if company and company.strip().lower() not in ('none',''):
        mapped['company_name'] = company.strip()

    # mobile
    m = normalize_mobile(mobile)
    if m:
        mapped['mobile'] = m

    # email
    if email and email.strip().lower() not in ('none',''):
        mapped['email'] = email.strip()

    # lead_source
    ls = row.get('lead source') or row.get('  lead source  ') or row.get('  lead source')
    if ls and ls.strip().lower() not in ('none',''):
        mapped['lead_source'] = ls.strip()

    # lead_status / current status
    st = row.get('current status of lead') or row.get('current status of lead  ') or row.get('final outcome')
    if st and st.strip().lower() not in ('none',''):
        mapped['lead_status'] = st.strip()

    # remarks: combine Call Outcome + Learning / Challenge
    remarks_parts = []
    for k in ('call outcome', 'call outcome  ', 'learning / challenge faced', 'call outcome  '):
        v = row.get(k)
        if v and v.strip().lower() not in ('none',''):
            remarks_parts.append(v.strip())
    if remarks_parts:
        mapped['remarks'] = ' | '.join(remarks_parts)

    # product_type from Product/Service Discussed
    prod = row.get('product/service discussed') or row.get('product/service discussed  ') or row.get('product/service discussed')
    if prod and prod.strip().lower() not in ('none',''):
        mapped['product_type'] = prod.strip()

    # funding_amount from Deal Value
    dv = row.get('deal value (if closed)') or row.get('deal value')
    if dv and dv.strip().lower() not in ('none',''):
        try:
            mapped['funding_amount'] = float(re.sub(r'[^0-9.]','', dv))
        except Exception:
            pass

    # location
    loc = row.get('location (city, state)') or row.get('location (city, state)  ') or row.get('location')
    city, state = parse_location(loc)
    if city:
        mapped['city'] = city
    if state:
        mapped['state'] = state

    return mapped


def import_csv(path: str):
    if not os.path.exists(path):
        print('CSV not found:', path)
        return
    created = 0
    skipped = 0
    db = SessionLocal()
    try:
        encodings = ['utf-8', 'utf-8-sig', 'cp1252', 'latin-1']
        rows = None
        headers = None
        f = None
        for enc in encodings:
            try:
                if f is not None:
                    f.close()
                f = open(path, newline='', encoding=enc)
                reader = csv.reader(f)
                raw_header = next(reader)
                headers = [norm(h or '') for h in raw_header]
                rows = list(reader)
                break
            except UnicodeDecodeError:
                if f is not None:
                    f.close()
                f = None
                continue
            except Exception:
                if f is not None:
                    f.close()
                raise
        if headers is None or rows is None:
            raise ValueError(f"Could not decode CSV file using encodings: {encodings}")

        # build index map: normalized header -> original header value
        # Then use dict reader style on remaining rows
        for row in rows:
            row_dict = {headers[i]: (row[i] if i < len(row) else '') for i in range(len(headers))}
            mapped = map_row(headers, row_dict)
            # sanitize and enforce schema limits
            # schema limits: lead_name 255, product_type 100, remarks 1000
            if mapped.get('lead_name'):
                mapped['lead_name'] = mapped['lead_name'][:255]
            if mapped.get('product_type'):
                mapped['product_type'] = mapped['product_type'][:100]
            if mapped.get('remarks'):
                mapped['remarks'] = mapped['remarks'][:1000]

            # ensure at least one of lead_name, mobile, or email exists; else create fallback name
            if not mapped.get('lead_name') and not mapped.get('mobile') and not mapped.get('email'):
                # create a fallback lead_name using row index
                mapped['lead_name'] = f"Imported Lead {skipped + created + 1}"
            # fill defaults where needed
            # avoid creating duplicate leads: check by mobile or email
            try:
                q = None
                if mapped.get('mobile'):
                    q = db.query(Lead).filter(Lead.mobile == mapped.get('mobile'))
                elif mapped.get('email'):
                    q = db.query(Lead).filter(Lead.email == mapped.get('email'))
                if q is not None and q.first() is not None:
                    # already exists, skip
                    skipped += 1
                    continue
            except Exception:
                # if any error checking existence, proceed to create anyway
                pass

            # create lead using sanitized values
            lead_in = LeadCreate(
                lead_name=mapped.get('lead_name') or 'Unknown',
                company_name=mapped.get('company_name'),
                mobile=mapped.get('mobile'),
                alternate_mobile=None,
                email=mapped.get('email'),
                company_email=None,
                city=mapped.get('city'),
                state=mapped.get('state'),
                product_type=mapped.get('product_type'),
                funding_amount=mapped.get('funding_amount'),
                lead_source=mapped.get('lead_source'),
                lead_status=mapped.get('lead_status') or 'New',
                assigned_to=None,
                remarks=mapped.get('remarks'),
            )
            created_lead = create_lead(db, lead_in)
            created += 1
            if created % 100 == 0:
                print(f'Created {created} leads...')
    finally:
        db.close()

    print(f'Finished import. Created={created} Skipped={skipped}')


if __name__ == '__main__':
    path = sys.argv[1] if len(sys.argv) > 1 else 'tmp/lead_journey.csv'
    import_csv(path)
