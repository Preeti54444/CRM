"""Performance Scheduler Service - Automated Cron Jobs"""
import asyncio
import logging
from datetime import datetime, time
from typing import Optional, Set

from sqlalchemy.orm import Session

from ..database import SessionLocal
from ..services.performance_calculation_service import PerformanceCalculationService
from ..services.performance_notification_service import PerformanceNotificationService
from ..services.target_engine_service import TargetEngineService
from ..models.user import User

logger = logging.getLogger(__name__)


class PerformanceScheduler:
    """Scheduler for automated performance checks and report generation"""

    def __init__(self):
        self.running = False
        self.task: Optional[asyncio.Task] = None
        self._fired_today: Set[str] = set()

    def _should_fire(self, key: str) -> bool:
        today_key = f"{datetime.now().date()}:{key}"
        if today_key in self._fired_today:
            return False
        self._fired_today.add(today_key)
        if len(self._fired_today) > 50:
            self._fired_today = {k for k in self._fired_today if str(datetime.now().date()) in k}
        return True

    async def scheduler_loop(self):
        logger.info("Performance scheduler started")
        self.running = True

        while self.running:
            try:
                now = datetime.now()
                current_time = now.time()
                current_day = now.weekday()

                # 9:30 AM - Today's targets assigned
                if current_time >= time(9, 30) and current_time < time(9, 31):
                    if self._should_fire("morning_assign"):
                        logger.info("Running 9:30 AM target assignment notification")
                        await self.run_target_assignment_notification()
                    await asyncio.sleep(60)
                    continue

                # 12:00 PM - Morning progress check
                if current_time >= time(12, 0) and current_time < time(12, 1):
                    if self._should_fire("noon_progress"):
                        logger.info("Running 12 PM morning progress check")
                        await self.run_morning_target_check()
                    await asyncio.sleep(60)
                    continue

                # 3:00 PM - Afternoon reminder
                if current_time >= time(15, 0) and current_time < time(15, 1):
                    if self._should_fire("afternoon_reminder"):
                        logger.info("Running 3 PM afternoon reminder")
                        await self.run_afternoon_reminder()
                    await asyncio.sleep(60)
                    continue

                # 5:00 PM - Target warning
                if current_time >= time(17, 0) and current_time < time(17, 1):
                    if self._should_fire("target_warning"):
                        logger.info("Running 5 PM target warning")
                        await self.run_target_warning()
                    await asyncio.sleep(60)
                    continue

                # 5:30 PM - 30 min before logout reminder
                if current_time >= time(17, 30) and current_time < time(17, 31):
                    if self._should_fire("logout_reminder"):
                        logger.info("Running 5:30 PM pending target reminder")
                        await self.run_logout_reminder()
                    await asyncio.sleep(60)
                    continue

                # 6:30 PM - End of day summary + carry forward
                if current_time >= time(18, 30) and current_time < time(18, 31):
                    if self._should_fire("eod_summary"):
                        logger.info("Running end of day summary")
                        await self.run_end_of_day()
                    await asyncio.sleep(60)
                    continue

                # Wednesday 5:00 PM - Mid-week evaluation
                if current_day == 2 and current_time >= time(17, 0) and current_time < time(17, 1):
                    if self._should_fire("midweek_report"):
                        logger.info("Running mid-week report generation")
                        await self.run_midweek_report_generation()
                    await asyncio.sleep(60)
                    continue

                # Saturday 6:00 PM - Weekly report + reset
                if current_day == 5 and current_time >= time(18, 0) and current_time < time(18, 1):
                    if self._should_fire("weekly_report"):
                        logger.info("Running weekly report generation and reset")
                        await self.run_weekly_report_generation()
                    await asyncio.sleep(60)
                    continue

                await asyncio.sleep(30)

            except Exception as e:
                logger.error(f"Error in performance scheduler: {e}", exc_info=True)
                await asyncio.sleep(60)

    async def run_target_assignment_notification(self):
        db = SessionLocal()
        try:
            PerformanceNotificationService.notify_target_assignment(db)
        finally:
            db.close()

    async def run_morning_target_check(self):
        db = SessionLocal()
        try:
            PerformanceNotificationService.check_all_employees_morning_targets(db)
            PerformanceCalculationService.calculate_all_employees_daily_performance(db)
        finally:
            db.close()

    async def run_afternoon_reminder(self):
        db = SessionLocal()
        try:
            PerformanceNotificationService.send_afternoon_reminders(db)
        finally:
            db.close()

    async def run_target_warning(self):
        db = SessionLocal()
        try:
            PerformanceNotificationService.send_target_warnings(db)
        finally:
            db.close()

    async def run_logout_reminder(self):
        db = SessionLocal()
        try:
            PerformanceNotificationService.send_logout_reminders(db)
        finally:
            db.close()

    async def run_end_of_day(self):
        db = SessionLocal()
        try:
            TargetEngineService.process_end_of_day(db)
            PerformanceNotificationService.send_end_of_day_summaries(db)
        finally:
            db.close()

    async def run_daily_target_check(self):
        db = SessionLocal()
        try:
            PerformanceNotificationService.check_all_employees_daily_targets(db)
            PerformanceCalculationService.calculate_all_employees_daily_performance(db)
        finally:
            db.close()

    async def run_midweek_report_generation(self):
        db = SessionLocal()
        try:
            from ..services.target_configuration_service import TargetConfigurationService
            employees = db.query(User).filter(User.role == "Employee").all()
            for employee in employees:
                if TargetConfigurationService.has_targets(employee.full_name):
                    PerformanceCalculationService.calculate_midweek_performance(
                        db, employee.id, employee.full_name
                    )
                    PerformanceNotificationService.notify_midweek_report_generated(db, employee.id)
        finally:
            db.close()

    async def run_weekly_report_generation(self):
        db = SessionLocal()
        try:
            TargetEngineService.process_weekly_reset(db)
            reports = PerformanceCalculationService.calculate_all_employees_weekly_performance(db)
            for report in reports:
                PerformanceNotificationService.notify_weekly_report_generated(db, report.employee_id)
        finally:
            db.close()

    def stop(self):
        self.running = False
        if self.task and not self.task.done():
            self.task.cancel()


performance_scheduler = PerformanceScheduler()


async def performance_scheduler_loop():
    await performance_scheduler.scheduler_loop()


def perform_daily_checks():
    """Run the daily checks once in a synchronous context (for Celery tasks)."""
    import asyncio
    return asyncio.run(performance_scheduler.run_daily_target_check())


def perform_end_of_day_checks():
    import asyncio
    return asyncio.run(performance_scheduler.run_end_of_day())


def perform_weekly_checks():
    import asyncio
    return asyncio.run(performance_scheduler.run_weekly_report_generation())
