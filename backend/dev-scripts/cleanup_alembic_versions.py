from dotenv import load_dotenv
from sqlalchemy import create_engine, text
import os

load_dotenv('.env')
url = os.getenv('DATABASE_URL')
if not url:
    raise SystemExit('DATABASE_URL not found in .env')

engine = create_engine(url)
ancestors = ['1eed7c4f7a', '2f14a6e3b89', '2a1b2c3d4e5f']
head = 'add_pipeline_system'

with engine.begin() as conn:
    rows = [r[0] for r in conn.execute(text('SELECT version_num FROM alembic_version ORDER BY version_num')).fetchall()]
    print('BEFORE:', rows)
    for rev in ancestors:
        if rev in rows:
            conn.execute(text('DELETE FROM alembic_version WHERE version_num = :rev'), {'rev': rev})
            print('REMOVED ancestor', rev)
    if conn.execute(text('SELECT 1 FROM alembic_version WHERE version_num = :rev'), {'rev': head}).fetchone() is None:
        conn.execute(text('INSERT INTO alembic_version (version_num) VALUES (:rev)'), {'rev': head})
        print('STAMPED head', head)
    rows = [r[0] for r in conn.execute(text('SELECT version_num FROM alembic_version ORDER BY version_num')).fetchall()]
    print('AFTER:', rows)
