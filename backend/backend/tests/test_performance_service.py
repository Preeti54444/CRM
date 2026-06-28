import pytest
from datetime import date

from app.database import SessionLocal
from app.services.performance_service import compute_daily_for_date


def test_compute_daily_runs_without_error():
    db = SessionLocal()
    try:
        results = compute_daily_for_date(db, date.today())
        assert isinstance(results, list)
    finally:
        db.close()
