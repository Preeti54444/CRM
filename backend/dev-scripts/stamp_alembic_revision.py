import os
import sys
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

if len(sys.argv) != 2:
    print('Usage: python stamp_alembic_revision.py <revision_id>')
    raise SystemExit(1)
rev = sys.argv[1]
load_dotenv('.env')
url = os.getenv('DATABASE_URL')
if not url:
    raise SystemExit('DATABASE_URL not found in .env')
engine = create_engine(url)
with engine.begin() as conn:
    exists = conn.execute(text("SELECT 1 FROM alembic_version WHERE version_num = :rev"), {'rev': rev}).fetchone()
    if exists:
        print(f'Revision {rev} already stamped')
    else:
        conn.execute(text("INSERT INTO alembic_version (version_num) VALUES (:rev)"), {'rev': rev})
        print(f'Stamped revision {rev}')
    rows = conn.execute(text("SELECT version_num FROM alembic_version ORDER BY version_num")).fetchall()
    print('CURRENT_REVISIONS=', [r[0] for r in rows])
