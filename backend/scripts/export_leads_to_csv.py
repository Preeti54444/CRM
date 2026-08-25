"""
Export all rows from the leads table to a CSV file.
Usage:
    python scripts/export_leads_to_csv.py tmp/leads_db_export.csv
"""
from __future__ import annotations
import sys
import os
import csv

sys.path.insert(0, os.getcwd())
from app.database import engine
from sqlalchemy import text


def export(outpath: str):
    os.makedirs(os.path.dirname(outpath), exist_ok=True)
    with engine.connect() as conn:
        q = text("SELECT * FROM leads ORDER BY created_at DESC")
        res = conn.execute(q)
        rows = res.fetchall()
        keys = res.keys()
        with open(outpath, 'w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            writer.writerow(keys)
            for r in rows:
                # r is a tuple; write by index
                writer.writerow([r[i] if r[i] is not None else '' for i in range(len(keys))])
    print('Exported', len(rows), 'rows to', outpath)


if __name__ == '__main__':
    out = sys.argv[1] if len(sys.argv) > 1 else 'tmp/leads_db_export.csv'
    export(out)
