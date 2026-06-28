from sqlalchemy import create_engine, text

engine = create_engine('postgresql://crm_user:crm_password@postgres:5432/crm_database')
with engine.connect() as conn:
    result = conn.execute(text('SELECT version_num FROM alembic_version'))
    print('Current DB revision:', result.fetchone()[0])
