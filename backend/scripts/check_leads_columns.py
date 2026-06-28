import sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
sys.path.append(str(ROOT))

from app.database import engine
from sqlalchemy import inspect

inspector = inspect(engine)
if 'leads' in inspector.get_table_names():
    cols = inspector.get_columns('leads')
    print('leads columns:')
    for c in cols:
        print('-', c['name'], c.get('type'))
else:
    print('leads table does not exist')
