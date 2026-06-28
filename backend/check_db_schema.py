from app.database import engine
from sqlalchemy import inspect

inspector = inspect(engine)
print('Tables:', inspector.get_table_names())
columns = inspector.get_columns('leads')
print('\nLeads table columns:')
for col in columns:
    print(f"{col['name']}: nullable={col['nullable']}, default={col.get('default')}")
