"""Export leads table (including image_url) to CSV for review.
Usage:
  PYTHONPATH=. python scripts/export_leads_with_images_to_csv.py tmp/leads_with_images.csv
"""
import sys, os, csv
sys.path.insert(0, os.getcwd())
from app.database import engine
from sqlalchemy import text

def run(outpath):
    with engine.connect() as conn:
        rows = conn.execute(text('SELECT id, lead_name, company_name, mobile, email, lead_source, lead_status, created_at, image_url FROM leads ORDER BY id')).fetchall()
    os.makedirs(os.path.dirname(outpath), exist_ok=True)
    with open(outpath, 'w', newline='', encoding='utf-8') as f:
        w = csv.writer(f)
        w.writerow(['id','lead_name','company_name','mobile','email','lead_source','lead_status','created_at','image_url'])
        for r in rows:
            w.writerow([r[0], r[1], r[2], r[3], r[4], r[5], r[6], r[7].isoformat() if r[7] else '', r[8]])
    print('Exported', len(rows), 'rows to', outpath)

if __name__ == '__main__':
    out = sys.argv[1] if len(sys.argv) > 1 else 'tmp/leads_with_images.csv'
    run(out)
