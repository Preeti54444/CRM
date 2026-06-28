# Performance Engine

This folder adds the automated performance & reporting engine to the existing CRM.

Quick start (development):

1. Install dependencies:

```bash
python -m pip install -r requirements.txt
```

2. Run migrations:

```bash
alembic upgrade head
```

3. Start the app:

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8085
```

4. Run tests:

```bash
pytest -q
```
