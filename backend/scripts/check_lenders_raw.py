import db
from sqlalchemy import inspect, text

engine = db.engine
inspector = inspect(engine)
print('tables =', inspector.get_table_names())
print('has lenders_raw =', 'lenders_raw' in inspector.get_table_names())

if 'lenders_raw' in inspector.get_table_names():
    cols = [col['name'] for col in inspector.get_columns('lenders_raw')]
    print('cols =', cols)
    with engine.connect() as conn:
        count = conn.execute(text('SELECT count(*) FROM lenders_raw')).scalar()
        print('count =', count)
        rows = conn.execute(text('SELECT * FROM lenders_raw LIMIT 3')).fetchall()
        print('sample rows =', rows)
