"""
Detailed duplicate and assignee reports.
Outputs into scripts/reports/:
 - detailed_duplicates.csv  -- leads with >1 raw rows: lead fields + raw count + first/last raw dates + timeline count
 - assignee_report.csv      -- per-assignee counts (created, updated, timeline events)
 - missing_assignee_rows.csv-- raw rows where Sales Executive present but lead.assigned_to is NULL

Run from backend folder:
    py scripts\reports\detailed_reports.py
"""
from __future__ import annotations
import csv
import json
import os
from pathlib import Path
from datetime import datetime

import sys
sys.path.insert(0, os.getcwd())
from app.database import engine
from sqlalchemy import text

OUT_DIR = Path('scripts') / 'reports'
OUT_DIR.mkdir(parents=True, exist_ok=True)

conn = engine.connect()
try:
    # detailed duplicates
    q = '''
    SELECT l.id as lead_id, l.lead_name, l.company_name, l.email, l.mobile, l.assigned_to,
           COUNT(r.id) as raw_rows_count,
           MIN(r.date_of_entry) as first_raw, MAX(r.date_of_entry) as last_raw,
           COALESCE(t.timeline_cnt, 0) as timeline_count
    FROM lead_import_raw r
    JOIN leads l ON l.id = r.lead_id
    LEFT JOIN (
        SELECT lead_id, COUNT(*) as timeline_cnt FROM timeline_events GROUP BY lead_id
    ) t ON t.lead_id = l.id
    GROUP BY l.id, l.lead_name, l.company_name, l.email, l.mobile, l.assigned_to, t.timeline_cnt
    HAVING COUNT(r.id) > 1
    ORDER BY COUNT(r.id) DESC
    '''
    with open(OUT_DIR / 'detailed_duplicates.csv', 'w', newline='', encoding='utf-8') as f:
        w = csv.writer(f)
        w.writerow(['lead_id','lead_name','company_name','email','mobile','assigned_to','raw_rows_count','first_raw','last_raw','timeline_count'])
        for row in conn.execute(text(q)):
            w.writerow([row[0], row[1], row[2], row[3], row[4], str(row[5]) if row[5] else None, row[6], row[7].isoformat() if row[7] else None, row[8].isoformat() if row[8] else None, row[9]])

    # assignee report: per-user counts of leads assigned, timeline events for their leads
    q2 = '''
    SELECT u.id as user_id, u.full_name, u.email,
           COUNT(l.id) as leads_assigned,
           COALESCE(SUM(li.raw_cnt),0) as raw_rows_mapped,
           COALESCE(SUM(te.timeline_cnt),0) as timeline_events
    FROM users u
    LEFT JOIN leads l ON l.assigned_to = u.id
    LEFT JOIN (
        SELECT lead_id, COUNT(*) as raw_cnt FROM lead_import_raw WHERE lead_id IS NOT NULL GROUP BY lead_id
    ) li ON li.lead_id = l.id
    LEFT JOIN (
        SELECT lead_id, COUNT(*) as timeline_cnt FROM timeline_events GROUP BY lead_id
    ) te ON te.lead_id = l.id
    GROUP BY u.id, u.full_name, u.email
    ORDER BY leads_assigned DESC
    '''
    with open(OUT_DIR / 'assignee_report.csv', 'w', newline='', encoding='utf-8') as f:
        w = csv.writer(f)
        w.writerow(['user_id','full_name','email','leads_assigned','raw_rows_mapped','timeline_events'])
        for row in conn.execute(text(q2)):
            w.writerow([str(row[0]), row[1], row[2], row[3], row[4], row[5]])

    # missing assignee rows: where sales exec present in raw data but leads.assigned_to IS NULL
    q3 = '''
    SELECT r.id as raw_id, r.source_file, r.row_num, r.date_of_entry, r.lead_id, r.data
    FROM lead_import_raw r
    LEFT JOIN leads l ON l.id = r.lead_id
    WHERE (r.data->> 'Sales Executive ' IS NOT NULL OR r.data->> 'Sales Executive' IS NOT NULL)
      AND (l.assigned_to IS NULL)
    ORDER BY r.id
    '''
    with open(OUT_DIR / 'missing_assignee_rows.csv', 'w', newline='', encoding='utf-8') as f:
        w = csv.writer(f)
        w.writerow(['raw_id','source_file','row_num','date_of_entry','lead_id','data'])
        for row in conn.execute(text(q3)):
            w.writerow([row[0], row[1], row[2], row[3].isoformat() if row[3] else None, row[4], row[5]])

    print('Detailed reports written to', OUT_DIR)

finally:
    conn.close()
