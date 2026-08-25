from pathlib import Path
import sys
from datetime import date
ROOT = Path(__file__).resolve().parents[1]
sys.path.append(str(ROOT))

from sqlalchemy import text
from app.database import engine

email = 'saleem.k@fundingsathi.in'
lead_name = 'Takeover Test Lead'
company_name = 'Takeover Co'
mobile = '9999999999'
lead_status = 'Inactive'
sales_executive = 'Saleem Khan'

with engine.begin() as conn:
    user = conn.execute(text('SELECT id, full_name FROM users WHERE LOWER(email) = :email'), {'email': email.lower()}).first()
    if not user:
        print('Saleem user not found for', email)
        raise SystemExit(1)
    saleem_id = user.id
    print('Found Saleem id:', saleem_id)

    # Insert lead
    result = conn.execute(text('''
        INSERT INTO leads (lead_name, company_name, mobile, email, created_by, sales_executive, lead_status, pipeline_stage, date_of_entry, created_at, updated_at)
        VALUES (:lead_name, :company_name, :mobile, :email, :created_by, :sales_executive, :lead_status, :pipeline_stage, :date_of_entry, now(), now())
        RETURNING id
    '''), {
        'lead_name': lead_name,
        'company_name': company_name,
        'mobile': mobile,
        'email': 'takeover@test.example',
        'created_by': saleem_id,
        'sales_executive': sales_executive,
        'lead_status': lead_status,
        'pipeline_stage': 'New Leads',
        'date_of_entry': date.today()
    })

    inserted = result.fetchone()
    if inserted:
        print('Inserted lead id:', inserted.id)
    else:
        print('Insert did not return id')
