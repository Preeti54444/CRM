import pytest
from app.database import Base, engine, SessionLocal
import importlib
import app.models as models_pkg


@pytest.fixture(scope="session", autouse=True)
def setup_db():
    # Ensure all model modules are imported so tables and FKs are registered
    for mod_name in getattr(models_pkg, '__all__', []):
        try:
            importlib.import_module(f"app.models.{mod_name}")
        except Exception:
            pass

    # create tables for tests
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def db():
    connection = engine.connect()
    transaction = connection.begin()
    session = SessionLocal(bind=connection)

    try:
        yield session
    finally:
        session.close()
        transaction.rollback()
        connection.close()
