"""Populate `image_url` on `leads` from raw import or placeholders.
Usage:
  PYTHONPATH=. python scripts/populate_lead_images.py
"""
from __future__ import annotations
import os
import sys
import json
import urllib.parse
from datetime import datetime

sys.path.insert(0, os.getcwd())
from app.database import engine
from sqlalchemy import text


def add_column_if_missing():
    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE leads ADD COLUMN IF NOT EXISTS image_url TEXT"))


def extract_image_from_data(data_json):
    # data_json is a dict of header->string
    if not data_json:
        return None
    # check common keys
    keys = list(data_json.keys())
    for k in keys:
        lk = k.strip().lower()
        if 'image' in lk or 'photo' in lk or 'picture' in lk or 'avatar' in lk:
            v = data_json.get(k)
            if v and isinstance(v, str) and (v.startswith('http://') or v.startswith('https://')):
                return v
    return None


def placeholder_url(name):
    if not name:
        name = 'User'
    qs = urllib.parse.urlencode({'name': name, 'background': 'ffffff', 'color': '7f1d1d'})
    return f'https://ui-avatars.com/api/?{qs}'


def run():
    add_column_if_missing()
    updated = 0
    checked = 0
    with engine.connect() as conn:
        rows = conn.execute(text('SELECT id, data, lead_id FROM lead_import_raw WHERE lead_id IS NOT NULL')).fetchall()
        for r in rows:
            checked += 1
            # result row may be tuple-like
            raw = r[1]
            lead_id = r[2]
            try:
                data_json = json.loads(raw) if isinstance(raw, str) else (raw or {})
            except Exception:
                data_json = {}

            # find image in raw
            img = extract_image_from_data(data_json)
            # find name for placeholder
            name = None
            for k in data_json:
                if 'contact' in k.lower() and 'name' in k.lower():
                    name = data_json.get(k)
                    break
                if 'customer' in k.lower() and 'company' in k.lower():
                    name = data_json.get(k)
            if not img:
                img = placeholder_url(name)

            # update leads.image_url only if not already set
            conn.execute(text('UPDATE leads SET image_url = COALESCE(image_url, :img) WHERE id = :id AND (image_url IS NULL OR image_url = \'\')'), {'img': img, 'id': lead_id})
            updated += 1

    print(f'Processed {checked} raw rows, set image_url for {updated} leads')


if __name__ == '__main__':
    run()
