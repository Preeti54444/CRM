from datetime import date, datetime
from sqlalchemy import func, and_
from sqlalchemy.orm import Session

from ..models.call import Call
from ..models.lead import Lead
from ..models.meeting import Meeting
from ..models.targets import Target
from ..models.performance import EmployeePerformanceDaily


CALL_WEIGHT = 0.4
LEAD_WEIGHT = 0.4
EXPLORATION_WEIGHT = 0.2


def compute_daily_for_date(db: Session, target_date: date):
    # Get all targets (per-user)
    targets = db.query(Target).all()

    results = []
    for t in targets:
        user_id = t.user_id

        # Calls completed (status Completed) on date
        calls_q = db.query(func.count(Call.id)).filter(
            Call.created_by == user_id,
            Call.call_date == target_date,
            func.lower(Call.status) == 'completed'
        )
        calls_completed = calls_q.scalar() or 0

        # Leads created on date by this user
        leads_q = db.query(func.count(Lead.id)).filter(
            func.date(Lead.created_at) == target_date,
            Lead.created_by == user_id
        )
        leads_created = leads_q.scalar() or 0

        # Exploration calls: purpose ILIKE '%explor%'
        exploration_q = db.query(func.count(Call.id)).filter(
            Call.created_by == user_id,
            Call.call_date == target_date,
            func.coalesce(func.lower(Call.purpose), '').like('%explor%')
        )
        exploration_calls = exploration_q.scalar() or 0

        # Meetings booked
        meetings_q = db.query(func.count(Meeting.id)).filter(
            Meeting.meeting_date != None,
            func.date(Meeting.meeting_date) == target_date,
            Meeting.lead_id != None
        )
        meetings_booked = meetings_q.scalar() or 0

        # Compute achievement percentages against targets
        call_target = t.daily_call_target or 0
        lead_target = t.daily_lead_target or 0
        exploration_target = getattr(t, 'daily_exploration_target', 0) or 0

        call_ach = (calls_completed / call_target) if call_target > 0 else 0
        lead_ach = (leads_created / lead_target) if lead_target > 0 else 0
        explor_ach = (exploration_calls / exploration_target) if exploration_target > 0 else 0

        achievement = (call_ach * CALL_WEIGHT + lead_ach * LEAD_WEIGHT + explor_ach * EXPLORATION_WEIGHT) * 100

        # Zone mapping
        if achievement >= 100:
            zone = 'green'
        elif achievement >= 70:
            zone = 'yellow'
        else:
            zone = 'red'

        # Upsert daily performance
        perf = db.query(EmployeePerformanceDaily).filter(
            EmployeePerformanceDaily.employee_id == user_id,
            EmployeePerformanceDaily.date == target_date
        ).one_or_none()

        if not perf:
            perf = EmployeePerformanceDaily(
                employee_id=user_id,
                date=target_date,
                calls_completed=calls_completed,
                leads_created=leads_created,
                exploration_calls=exploration_calls,
                meetings_booked=meetings_booked,
                achievement_percentage=achievement,
                zone=zone,
                last_activity=datetime.utcnow(),
                created_at=datetime.utcnow()
            )
            db.add(perf)
        else:
            perf.calls_completed = calls_completed
            perf.leads_created = leads_created
            perf.exploration_calls = exploration_calls
            perf.meetings_booked = meetings_booked
            perf.achievement_percentage = achievement
            perf.zone = zone
            perf.last_activity = datetime.utcnow()

        results.append({'employee_id': str(user_id), 'achievement': achievement, 'zone': zone})

    db.commit()
    return results
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
from ..models.performance import (
    EmployeeMidweekReport,
    EmployeeWeeklyReport,
    EmployeePerformanceDaily,
)
from ..services.notification_service import create_notification_event
from ..models.targets import Target

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


def create_target_missed_notifications(db: Session, target_date):
    # Run compute to ensure daily entries
    compute_daily_for_date(db, target_date)
    # Find red zone performers and notify them
    reds = db.query(EmployeePerformanceDaily).filter(EmployeePerformanceDaily.date == target_date, EmployeePerformanceDaily.zone == 'red').all()
    for r in reds:
        title = "Target Missed"
        message = f"You have not met daily targets for {target_date}. Achievement: {r.achievement_percentage:.2f}%"
        try:
            create_notification_event(db, r.employee_id, title, message, type='performance')
        except Exception:
            logger.exception("Failed to create notification for %s", r.employee_id)


def generate_midweek_reports(db: Session, week_start, week_end):
    targets = db.query(Target).all()
    for t in targets:
        user_id = t.user_id
        # Aggregate daily records for week so far
        agg = db.query(
            func.coalesce(func.sum(EmployeePerformanceDaily.calls_completed), 0),
            func.coalesce(func.sum(EmployeePerformanceDaily.leads_created), 0),
            func.coalesce(func.sum(EmployeePerformanceDaily.exploration_calls), 0),
            func.coalesce(func.avg(EmployeePerformanceDaily.achievement_percentage), 0),
        ).filter(
            EmployeePerformanceDaily.employee_id == user_id,
            EmployeePerformanceDaily.date >= week_start,
            EmployeePerformanceDaily.date <= week_end,
        ).one()

        calls_completed, leads_completed, exploration_completed, avg_ach = agg

        zone = 'green' if avg_ach >= 100 else ('yellow' if avg_ach >= 70 else 'red')

        report = EmployeeMidweekReport(
            employee_id=user_id,
            week_start=week_start,
            week_end=week_end,
            calls_completed=calls_completed,
            leads_completed=leads_completed,
            exploration_calls_completed=exploration_completed,
            achievement_percentage=avg_ach,
            zone=zone,
            generated_at=datetime.utcnow(),
        )
        db.add(report)
    db.commit()


def generate_weekly_reports(db: Session, week_start, week_end):
    targets = db.query(Target).all()
    leaderboard = []
    for t in targets:
        user_id = t.user_id
        agg = db.query(
            func.coalesce(func.sum(EmployeePerformanceDaily.calls_completed), 0),
            func.coalesce(func.sum(EmployeePerformanceDaily.leads_created), 0),
            func.coalesce(func.sum(EmployeePerformanceDaily.exploration_calls), 0),
            func.coalesce(func.sum(EmployeePerformanceDaily.meetings_booked), 0),
            func.coalesce(func.avg(EmployeePerformanceDaily.achievement_percentage), 0),
        ).filter(
            EmployeePerformanceDaily.employee_id == user_id,
            EmployeePerformanceDaily.date >= week_start,
            EmployeePerformanceDaily.date <= week_end,
        ).one()

        total_calls, total_leads, total_explor, total_meetings, avg_ach = agg

        perf_score = avg_ach  # for now use avg achievement as score
        zone = 'green' if avg_ach >= 100 else ('yellow' if avg_ach >= 70 else 'red')

        report = EmployeeWeeklyReport(
            employee_id=user_id,
            week_start=week_start,
            week_end=week_end,
            total_calls=total_calls,
            total_leads=total_leads,
            total_exploration_calls=total_explor,
            total_meetings=total_meetings,
            achievement_percentage=avg_ach,
            performance_score=perf_score,
            zone=zone,
            generated_at=datetime.utcnow(),
        )
        db.add(report)
        leaderboard.append((user_id, perf_score))

    db.commit()

    # Rank and notify
    leaderboard.sort(key=lambda x: x[1], reverse=True)
    for rank, (user_id, score) in enumerate(leaderboard, start=1):
        db.query(EmployeeWeeklyReport).filter(
            EmployeeWeeklyReport.employee_id == user_id,
            EmployeeWeeklyReport.week_start == week_start,
            EmployeeWeeklyReport.week_end == week_end,
        ).update({"rank": rank}, synchronize_session=False)

    db.commit()



async def scheduler_loop() -> None:
    last_midweek_run = None
    last_weekly_run = None
    last_morning_run = None
    last_daily_run = None
    interval_seconds = max(60, settings.scheduler_interval_minutes) * 60

    logger.info("Performance scheduler started; interval=%s minutes", settings.scheduler_interval_minutes)

    while True:
        now = datetime.utcnow()
        try:
            with SessionLocal() as db:
                # Morning check (12:30 server time)
                if now.hour == 12 and now.minute == 30 and last_morning_run != now.date():
                    logger.info("Running morning performance check for %s", now.date())
                    create_target_missed_notifications(db, now.date())
                    last_morning_run = now.date()

                # Daily check (18:30 server time)
                if now.hour == 18 and now.minute == 30 and last_daily_run != now.date():
                    logger.info("Running daily performance check for %s", now.date())
                    create_target_missed_notifications(db, now.date())
                    last_daily_run = now.date()

                # Mid-week evaluation (Wednesday 17:00)
                if now.weekday() == 2 and now.hour == 17 and last_midweek_run != now.date():
                    logger.info("Running midweek report generation for week of %s", now.date())
                    week_start = now.date() - timedelta(days=now.weekday())
                    week_end = week_start + timedelta(days=6)
                    generate_midweek_reports(db, week_start, now.date())
                    # additionally run midweek evaluation hooks
                    run_midweek_evaluation(db)
                    last_midweek_run = now.date()

                # Weekly evaluation (Saturday 18:00)
                if now.weekday() == 5 and now.hour == 18 and last_weekly_run != now.date():
                    logger.info("Running weekly report generation for week of %s", now.date())
                    week_start = now.date() - timedelta(days=now.weekday())
                    week_end = week_start + timedelta(days=6)
                    generate_weekly_reports(db, week_start, week_end)
                    run_weekly_evaluation(db)
                    last_weekly_run = now.date()
        except Exception as exc:
            logger.exception("Performance scheduler encountered an error")

        await asyncio.sleep(interval_seconds)
