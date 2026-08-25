from pathlib import Path
import sys
ROOT = Path(__file__).resolve().parents[1]
sys.path.append(str(ROOT))

from app.database import engine

with engine.connect() as conn:
    try:
        res = conn.execute("SELECT * FROM alembic_version")
        rows = res.fetchall()
        print('alembic_version rows:', rows)
    except Exception as e:
        print('Error reading alembic_version:', e)
