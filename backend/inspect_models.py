import sys
from pathlib import Path
import inspect
import traceback
import importlib
from sqlalchemy.orm import DeclarativeMeta

sys.path.insert(0, '.')
package_dir = Path('app/models')
files = sorted([p for p in package_dir.iterdir() if p.is_file() and p.suffix == '.py'])
print('MODEL_FILES=')
for p in files:
    print(p.name)

print('\nINIT_PY=')
init_path = package_dir / '__init__.py'
print(init_path.read_text())

from app.database import Base

def inspect_module(mod_name):
    try:
        m = importlib.import_module(mod_name)
    except Exception as e:
        print('IMPORT_ERROR', mod_name, repr(e))
        tb = traceback.format_exc()
        print(tb)
        return
    classes = []
    for name, obj in inspect.getmembers(m, inspect.isclass):
        if obj.__module__ != mod_name:
            continue
        tablename = getattr(obj, '__tablename__', None)
        if tablename is not None:
            classes.append((name, tablename))
    if classes:
        for cls, tn in classes:
            print('MODEL', mod_name, cls, tn)
    else:
        print('NO_MODEL', mod_name)

print('\nIMPORT_EACH_MODULE=')
for p in files:
    mod = f'app.models.{p.stem}'
    inspect_module(mod)

print('\nBASE_TABLES=')
print(sorted(Base.metadata.tables.keys()))
for name, table in Base.metadata.tables.items():
    print('BASE_TABLE', name, table.fullname)

print('base_tables=')