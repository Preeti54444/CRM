"""
Generate import verification reports after running `import_preserve_exact_excel.py`.
Outputs (scripts/reports/):
 - lead_import_raw.csv        -- all raw rows with lead_id and data
 - duplicates_by_lead.csv    -- lead_id with count of raw rows mapping to it (count>1)
 - unmatched_rows.csv        -- raw rows where lead_id is NULL
 - timeline_summary.csv      -- per-lead timeline event counts and first/last event
 - import_summary.json       -- high-level counts

Run from backend folder:
    py scripts\generate_import_reports.py
"""
from __future__ import annotations
import csv
import json
import os
from pathlib import Path
from datetime import datetime

from sqlalchemy import text

# ensure app package importable
import sys
sys.path.insert(0, os.getcwd())
from app.database import engine

OUT_DIR = Path('scripts') / 'reports'
OUT_DIR.mkdir(parents=True, exist_ok=True)

conn = engine.connect()
try:
    # total rows
    total_rows = conn.execute(text('SELECT COUNT(*) FROM lead_import_raw')).scalar()
    matched_rows = conn.execute(text('SELECT COUNT(*) FROM lead_import_raw WHERE lead_id IS NOT NULL')).scalar()
    unmatched_rows = total_rows - matched_rows

    # export lead_import_raw
    with open(OUT_DIR / 'lead_import_raw.csv', 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(['id', 'source_file', 'row_num', 'date_of_entry', 'lead_id', 'data'])
        for row in conn.execute(text('SELECT id, source_file, row_num, date_of_entry, lead_id, data FROM lead_import_raw ORDER BY id')):
            writer.writerow([row[0], row[1], row[2], row[3].isoformat() if row[3] else None, row[4], json.dumps(row[5]) if row[5] is not None else None])

    # duplicates: raw rows grouped by lead_id where count>1
    with open(OUT_DIR / 'duplicates_by_lead.csv', 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(['lead_id', 'raw_rows_count'])
        for row in conn.execute(text('SELECT lead_id, COUNT(*) AS cnt FROM lead_import_raw WHERE lead_id IS NOT NULL GROUP BY lead_id HAVING COUNT(*) > 1 ORDER BY cnt DESC')):
            writer.writerow([row[0], row[1]])

    # unmatched rows
    with open(OUT_DIR / 'unmatched_rows.csv', 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(['id', 'source_file', 'row_num', 'date_of_entry', 'data'])
        for row in conn.execute(text('SELECT id, source_file, row_num, date_of_entry, data FROM lead_import_raw WHERE lead_id IS NULL ORDER BY id')):
            writer.writerow([row[0], row[1], row[2], row[3].isoformat() if row[3] else None, json.dumps(row[4]) if row[4] is not None else None])

    # timeline summary per lead
    with open(OUT_DIR / 'timeline_summary.csv', 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(['lead_id', 'timeline_events_count', 'first_event', 'last_event'])
        for row in conn.execute(text('''
            SELECT lead_id, COUNT(*) AS cnt, MIN(created_at) AS first_event, MAX(created_at) AS last_event
            FROM timeline_events
            WHERE lead_id IS NOT NULL
            GROUP BY lead_id
            ORDER BY cnt DESC
        ''')):
            writer.writerow([row[0], row[1], row[2].isoformat() if row[2] else None, row[3].isoformat() if row[3] else None])

    summary = {
        'generated_at': datetime.utcnow().isoformat(),
        'total_raw_rows': int(total_rows or 0),
        'matched_rows': int(matched_rows or 0),
        'unmatched_rows': int(unmatched_rows or 0),
        'duplicates_leads': conn.execute(text('SELECT COUNT(*) FROM (SELECT lead_id FROM lead_import_raw WHERE lead_id IS NOT NULL GROUP BY lead_id HAVING COUNT(*) > 1) q')).scalar(),
        'timeline_leads': conn.execute(text('SELECT COUNT(DISTINCT lead_id) FROM timeline_events WHERE lead_id IS NOT NULL')).scalar(),
    }
    with open(OUT_DIR / 'import_summary.json', 'w', encoding='utf-8') as f:
        json.dump(summary, f, indent=2)

    print('Reports written to', OUT_DIR)
    print(json.dumps(summary, indent=2))
finally:
    conn.close()
