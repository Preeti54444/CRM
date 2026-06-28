import asyncio
import logging
from datetime import datetime, timedelta

from sqlalchemy import func
from sqlalchemy.orm import Session

from ..config import settings
from ..database import SessionLocal
from ..models.eod_report import EODReport
from ..models.sod_report import SODReport
from ..models.wod_report import WODReport

logger = logging.getLogger(__name__)


def summarize_report_counts(db: Session) -> dict[str, int]:
    today = datetime.utcnow().date()
    week_start = today - timedelta(days=today.weekday())
    week_end = week_start + timedelta(days=7)

    sod_count = db.query(func.count(SODReport.id)).scalar() or 0
    eod_count = db.query(func.count(EODReport.id)).scalar() or 0
    wod_count = db.query(func.count(WODReport.id)).scalar() or 0
    recent_eod_score = db.query(func.avg(EODReport.daily_score)).filter(
        EODReport.report_date >= week_start,
        EODReport.report_date < week_end,
    ).scalar() or 0

    return {
        "sod_count": sod_count,
        "eod_count": eod_count,
        "wod_count": wod_count,
        "weekly_average_score": round(float(recent_eod_score), 2),
    }


def run_midweek_evaluation(db: Session) -> dict[str, int]:
    summary = summarize_report_counts(db)
    logger.info("Mid-week performance evaluation completed: %s", summary)
    return summary


def run_weekly_evaluation(db: Session) -> dict[str, int]:
    summary = summarize_report_counts(db)
    logger.info("Weekly performance evaluation completed: %s", summary)
    return summary


async def scheduler_loop() -> None:
    last_midweek_run = None
    last_weekly_run = None
    interval_seconds = max(60, settings.scheduler_interval_minutes) * 60

    logger.info("Performance scheduler started; interval=%s minutes", settings.scheduler_interval_minutes)

    while True:
        now = datetime.utcnow()
        try:
            with SessionLocal() as db:
                if now.weekday() == 2 and last_midweek_run != now.date():
                    run_midweek_evaluation(db)
                    last_midweek_run = now.date()

                if now.weekday() == 6 and last_weekly_run != now.date():
                    run_weekly_evaluation(db)
                    last_weekly_run = now.date()
        except Exception as exc:
            logger.exception("Performance scheduler encountered an error")

        await asyncio.sleep(interval_seconds)
