"""
Print all rows from the leads table using the application's DB settings.
Usage:
    python scripts/print_all_leads.py [--limit N]
"""
from __future__ import annotations
import os
import sys
import argparse

from sqlalchemy import text

# Ensure app package is importable
sys.path.insert(0, os.getcwd())

from app.config import settings
from app.database import engine


def main(limit: int | None = None):
    with engine.connect() as conn:
        if limit:
            q = text(f"SELECT * FROM leads ORDER BY created_at DESC LIMIT :limit")
            result = conn.execute(q, {"limit": limit})
        else:
            q = text("SELECT * FROM leads ORDER BY created_at DESC")
            result = conn.execute(q)

        rows = result.fetchall()

        if not rows:
            print('No rows returned from leads')
            return

        # Print column names
        cols = result.keys()
        print('\t'.join(cols))
        for r in rows:
            # Convert to string safely
            print('\t'.join(str(r[c]) if r[c] is not None else '' for c in cols))


if __name__ == '__main__':
    p = argparse.ArgumentParser()
    p.add_argument('--limit', type=int, default=500)
    args = p.parse_args()
    main(limit=args.limit)
