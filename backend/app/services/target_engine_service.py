"""Target Engine Service - Central automated target management engine"""
import logging
from datetime import datetime, date, timedelta, time
from typing import Dict, List, Optional
from uuid import UUID
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_

from ..models.call import Call
from ..models.lead import Lead
from ..models.user import User
from ..models.activity_log import ActivityLog
from ..models.employee_performance import EmployeeWeeklyReport
from ..models.target_management import TargetEarlyLogoutRequest
from ..schemas.target_management import (
    TodayTargetPanel,
    AdminEmployeeGridRow,
    AdminTargetKPIs,
    TargetLogoutCheckResponse,
)
from .target_configuration_service import TargetConfigurationService
from .carry_forward_service import CarryForwardService
from .target_audit_service import TargetAuditService
from .badge_service import BadgeService

logger = logging.getLogger(__name__)

QUALIFIED_LEAD_STATUSES = ["Qualified", "Warm", "Interested", "Hot", "qualified", "warm", "hot"]
OUTBOUND_CALL_TYPES = ["Outbound", "Outgoing", "outbound", "outgoing"]
OFFICE_START = time(9, 30)
OFFICE_END = time(18, 0)


class TargetEngineService:
    """Automated target calculation engine - single source of truth"""

    @staticmethod
    def get_outbound_calls(db: Session, employee_id: UUID, target_date: date) -> int:
        try:
            return db.query(Call).filter(
                and_(
                    Call.created_by == employee_id,
                    func.date(Call.created_at) == target_date,
                    or_(
                        Call.call_type.in_(OUTBOUND_CALL_TYPES),
                        func.lower(Call.call_type).in_(["outbound", "outgoing"]),
                    ),
                )
            ).count()
        except Exception as e:
            logger.error(f"Error getting outbound calls: {e}")
            db.rollback()
            return 0

    @staticmethod
    def get_qualified_leads(db: Session, employee_id: UUID, target_date: date) -> int:
        try:
            return db.query(Lead).filter(
                and_(
                    Lead.created_by == employee_id,
                    func.date(Lead.created_at) == target_date,
                    or_(
                        Lead.lead_status.in_(QUALIFIED_LEAD_STATUSES),
                        func.lower(Lead.lead_status).in_(["qualified", "warm", "hot", "interested"]),
                    ),
                )
            ).count()
        except Exception as e:
            logger.error(f"Error getting qualified leads: {e}")
            db.rollback()
            return 0

    @staticmethod
    def get_period_calls(db: Session, employee_id: UUID, start: date, end: date) -> int:
        try:
            return db.query(Call).filter(
                and_(
                    Call.created_by == employee_id,
                    func.date(Call.created_at) >= start,
                    func.date(Call.created_at) <= end,
                    or_(
                        Call.call_type.in_(OUTBOUND_CALL_TYPES),
                        func.lower(Call.call_type).in_(["outbound", "outgoing"]),
                    ),
                )
            ).count()
        except Exception as e:
            logger.error(f"Error getting period calls: {e}")
            db.rollback()
            return 0

    @staticmethod
    def get_period_leads(db: Session, employee_id: UUID, start: date, end: date) -> int:
        try:
            return db.query(Lead).filter(
                and_(
                    Lead.created_by == employee_id,
                    func.date(Lead.created_at) >= start,
                    func.date(Lead.created_at) <= end,
                    or_(
                        Lead.lead_status.in_(QUALIFIED_LEAD_STATUSES),
                        func.lower(Lead.lead_status).in_(["qualified", "warm", "hot", "interested"]),
                    ),
                )
            ).count()
        except Exception as e:
            logger.error(f"Error getting period leads: {e}")
            db.rollback()
            return 0

    @staticmethod
    def get_raw_metrics(db: Session, employee_id: UUID, target_date: date) -> dict:
        return {
            "outbound_calls": TargetEngineService.get_outbound_calls(db, employee_id, target_date),
            "qualified_leads": TargetEngineService.get_qualified_leads(db, employee_id, target_date),
        }

    @staticmethod
    def get_week_range(target_date: Optional[date] = None) -> tuple[date, date]:
        """Monday-Saturday work week"""
        if target_date is None:
            target_date = date.today()
        week_start = target_date - timedelta(days=target_date.weekday())
        week_end = week_start + timedelta(days=5)  # Saturday
        return week_start, week_end

    @staticmethod
    def get_midweek_range(target_date: Optional[date] = None) -> tuple[date, date]:
        """Monday-Wednesday mid-week range"""
        if target_date is None:
            target_date = date.today()
        week_start = target_date - timedelta(days=target_date.weekday())
        midweek_end = week_start + timedelta(days=2)  # Wednesday
        return week_start, midweek_end

    @staticmethod
    def calculate_zone(pct: float, has_activity: bool) -> str:
        if not has_activity:
            return "gray"
        if pct >= 100:
            return "green"
        if pct >= 70:
            return "yellow"
        return "red"

    @staticmethod
    def calculate_status(pct: float, has_activity: bool) -> str:
        if not has_activity:
            return "No Activity"
        if pct >= 100:
            return "Target Completed"
        if pct >= 70:
            return "On Track"
        if pct >= 50:
            return "Needs Attention"
        return "Behind Schedule"

    @staticmethod
    def calculate_expected_completion(
        completed: int, total_required: int, login_time: Optional[datetime] = None
    ) -> Optional[str]:
        if total_required <= 0 or completed >= total_required:
            return "Completed"
        if completed <= 0:
            return "6:00 PM"

        now = datetime.now()
        if login_time:
            elapsed = (now - login_time).total_seconds() / 3600
        else:
            start = datetime.combine(now.date(), OFFICE_START)
            elapsed = max(0.5, (now - start).total_seconds() / 3600)

        rate = completed / elapsed
        remaining = total_required - completed
        hours_needed = remaining / rate if rate > 0 else 8
        finish = now + timedelta(hours=hours_needed)
        end_of_day = datetime.combine(now.date(), OFFICE_END)
        if finish > end_of_day:
            finish = end_of_day
        return finish.strftime("%I:%M %p")

    @staticmethod
    def calculate_performance_score(
        call_pct: float, lead_pct: float, weekly_pct: float,
        login_consistency: float = 80.0, followup_pct: float = 70.0,
    ) -> float:
        """Weighted performance score out of 100"""
        score = (
            call_pct * 0.25 +
            lead_pct * 0.25 +
            weekly_pct * 0.20 +
            login_consistency * 0.10 +
            followup_pct * 0.10 +
            min(call_pct, lead_pct) * 0.10
        )
        return round(min(100.0, score), 1)

    @staticmethod
    def get_login_time(db: Session, employee_id: UUID, target_date: date) -> Optional[datetime]:
        try:
            log = db.query(ActivityLog).filter(
                and_(
                    ActivityLog.user_id == employee_id,
                    ActivityLog.action == "login",
                    func.date(ActivityLog.created_at) == target_date,
                )
            ).order_by(ActivityLog.created_at.asc()).first()
            return log.created_at if log else None
        except Exception as e:
            logger.error(f"Error getting login time: {e}")
            db.rollback()
            return None

    @staticmethod
    def get_last_activity(db: Session, employee_id: UUID) -> Optional[datetime]:
        last_call = db.query(func.max(Call.created_at)).filter(Call.created_by == employee_id).scalar()
        last_lead = db.query(func.max(Lead.created_at)).filter(Lead.created_by == employee_id).scalar()
        candidates = [t for t in [last_call, last_lead] if t]
        return max(candidates) if candidates else None

    @staticmethod
    def get_today_target_panel(
        db: Session, employee_id: UUID, employee_name: str, target_date: Optional[date] = None
    ) -> TodayTargetPanel:
        if target_date is None:
            target_date = date.today()

        try:
            daily_targets = TargetConfigurationService.get_daily_targets(employee_name, db=db, employee_id=employee_id)
            weekly_targets = TargetConfigurationService.get_weekly_targets(employee_name, db=db, employee_id=employee_id)
            midweek_targets = TargetConfigurationService.get_midweek_targets(employee_name, db=db, employee_id=employee_id)
        except Exception as e:
            logger.error(f"Error getting targets: {e}")
            daily_targets = {"daily_calls": 0, "daily_leads": 0}
            weekly_targets = {"weekly_calls": 0, "weekly_leads": 0}
            midweek_targets = {"midweek_calls": 0, "midweek_leads": 0}

        try:
            cf_record = CarryForwardService.get_carry_forward_for_date(db, employee_id, target_date)
        except Exception as e:
            logger.error(f"Error getting carry forward record: {e}")
            # Create a minimal fallback record
            from ..models.target_management import EmployeeCarryForward
            cf_record = EmployeeCarryForward(
                employee_id=employee_id,
                date=target_date,
                week_start=target_date,
                carry_forward_calls=0,
                carry_forward_leads=0,
                daily_calls_target=daily_targets.get("daily_calls", 0),
                daily_leads_target=daily_targets.get("daily_leads", 0),
                total_required_calls=daily_targets.get("daily_calls", 0),
                total_required_leads=daily_targets.get("daily_leads", 0),
                calls_completed=0,
                leads_completed=0,
                remaining_calls=daily_targets.get("daily_calls", 0),
                remaining_leads=daily_targets.get("daily_leads", 0),
            )

        try:
            calls_completed = TargetEngineService.get_outbound_calls(db, employee_id, target_date)
            leads_completed = TargetEngineService.get_qualified_leads(db, employee_id, target_date)
        except Exception as e:
            logger.error(f"Error getting completed counts: {e}")
            calls_completed = 0
            leads_completed = 0

        try:
            CarryForwardService.update_daily_progress(
                db, employee_id, calls_completed, leads_completed, target_date
            )
        except Exception as e:
            logger.error(f"Error updating daily progress: {e}")
            # Continue without updating progress

        total_calls = cf_record.total_required_calls
        total_leads = cf_record.total_required_leads
        calls_remaining = max(0, total_calls - calls_completed)
        leads_remaining = max(0, total_leads - leads_completed)

        calls_pct = round((calls_completed / total_calls * 100) if total_calls > 0 else 0, 1)
        leads_pct = round((leads_completed / total_leads * 100) if total_leads > 0 else 0, 1)
        overall_pct = round((calls_pct + leads_pct) / 2, 1)
        has_activity = calls_completed > 0 or leads_completed > 0

        week_start, week_end = TargetEngineService.get_week_range(target_date)
        mw_start, mw_end = TargetEngineService.get_midweek_range(target_date)

        try:
            weekly_calls = TargetEngineService.get_period_calls(db, employee_id, week_start, week_end)
            weekly_leads = TargetEngineService.get_period_leads(db, employee_id, week_start, week_end)
            midweek_calls = TargetEngineService.get_period_calls(db, employee_id, mw_start, min(mw_end, target_date))
            midweek_leads = TargetEngineService.get_period_leads(db, employee_id, mw_start, min(mw_end, target_date))
        except Exception as e:
            logger.error(f"Error getting period metrics: {e}")
            weekly_calls = 0
            weekly_leads = 0
            midweek_calls = 0
            midweek_leads = 0

        w_calls_target = weekly_targets.get("weekly_calls", 0)
        w_leads_target = weekly_targets.get("weekly_leads", 0)
        mw_calls_target = midweek_targets.get("midweek_calls", 0)
        mw_leads_target = midweek_targets.get("midweek_leads", 0)

        weekly_pct = round(
            ((weekly_calls / w_calls_target * 100 if w_calls_target else 0) +
             (weekly_leads / w_leads_target * 100 if w_leads_target else 0)) / 2, 1
        )
        midweek_pct = round(
            ((midweek_calls / mw_calls_target * 100 if mw_calls_target else 0) +
             (midweek_leads / mw_leads_target * 100 if mw_leads_target else 0)) / 2, 1
        )

        midweek_risk = "low" if midweek_pct >= 70 else ("medium" if midweek_pct >= 50 else "high")

        try:
            login_time = TargetEngineService.get_login_time(db, employee_id, target_date)
        except Exception as e:
            logger.error(f"Error getting login time: {e}")
            login_time = None
            
        expected_finish = TargetEngineService.calculate_expected_completion(
            calls_completed + leads_completed,
            total_calls + total_leads,
            login_time,
        )

        perf_score = TargetEngineService.calculate_performance_score(calls_pct, leads_pct, weekly_pct)

        try:
            weekly_report = db.query(EmployeeWeeklyReport).filter(
                and_(
                    EmployeeWeeklyReport.employee_id == employee_id,
                    func.date(EmployeeWeeklyReport.week_start) == week_start,
                )
            ).first()
        except Exception as e:
            logger.error(f"Error getting weekly report: {e}")
            weekly_report = None

        try:
            badges = [b["badge_name"] for b in BadgeService.get_employee_badges(db, employee_id, 5)]
        except Exception as e:
            logger.error(f"Error getting badges: {e}")
            badges = []

        return TodayTargetPanel(
            employee_id=employee_id,
            employee_name=employee_name,
            date=target_date,
            daily_calls_target=daily_targets.get("daily_calls", 0),
            carry_forward_calls=cf_record.carry_forward_calls,
            total_required_calls=total_calls,
            calls_completed=calls_completed,
            calls_remaining=calls_remaining,
            calls_progress_pct=calls_pct,
            daily_leads_target=daily_targets.get("daily_leads", 0),
            carry_forward_leads=cf_record.carry_forward_leads,
            total_required_leads=total_leads,
            leads_completed=leads_completed,
            leads_remaining=leads_remaining,
            leads_progress_pct=leads_pct,
            overall_progress_pct=overall_pct,
            status=TargetEngineService.calculate_status(overall_pct, has_activity),
            zone=TargetEngineService.calculate_zone(overall_pct, has_activity),
            expected_completion_time=expected_finish,
            weekly_calls_completed=weekly_calls,
            weekly_leads_completed=weekly_leads,
            weekly_calls_target=w_calls_target,
            weekly_leads_target=w_leads_target,
            weekly_progress_pct=weekly_pct,
            midweek_calls_completed=midweek_calls,
            midweek_leads_completed=midweek_leads,
            midweek_calls_target=mw_calls_target,
            midweek_leads_target=mw_leads_target,
            midweek_progress_pct=midweek_pct,
            midweek_risk_level=midweek_risk,
            performance_score=perf_score,
            current_rank=weekly_report.rank if weekly_report else None,
            badges=badges,
        )

    @staticmethod
    def check_logout(
        db: Session, employee_id: UUID, employee_name: str
    ) -> TargetLogoutCheckResponse:
        panel = TargetEngineService.get_today_target_panel(db, employee_id, employee_name)
        can_logout = panel.calls_remaining == 0 and panel.leads_remaining == 0

        approved = db.query(TargetEarlyLogoutRequest).filter(
            and_(
                TargetEarlyLogoutRequest.employee_id == employee_id,
                TargetEarlyLogoutRequest.status == "approved",
                func.date(TargetEarlyLogoutRequest.created_at) == date.today(),
            )
        ).first()

        if approved:
            can_logout = True

        from .logout_restriction_service import LogoutRestrictionService
        if LogoutRestrictionService.has_recent_override(db, employee_id, hours=12):
            can_logout = True

        if can_logout:
            message = "Daily target completed. You can logout."
        else:
            message = (
                f"You still have pending targets. "
                f"Remaining Calls: {panel.calls_remaining}, "
                f"Remaining Leads: {panel.leads_remaining}, "
                f"Carry Forward Calls: {panel.carry_forward_calls}, "
                f"Carry Forward Leads: {panel.carry_forward_leads}. "
                f"Please complete your assigned targets before logging out."
            )
            TargetAuditService.log(
                db, action="logout_attempt", employee_id=employee_id, details=message
            )

        return TargetLogoutCheckResponse(
            can_logout=can_logout,
            required_calls=panel.total_required_calls,
            required_leads=panel.total_required_leads,
            completed_calls=panel.calls_completed,
            completed_leads=panel.leads_completed,
            carry_forward_calls=panel.carry_forward_calls,
            carry_forward_leads=panel.carry_forward_leads,
            remaining_calls=panel.calls_remaining,
            remaining_leads=panel.leads_remaining,
            message=message,
            has_approved_early_logout=approved is not None,
        )

    @staticmethod
    def get_admin_employee_grid(db: Session, target_date: Optional[date] = None) -> List[AdminEmployeeGridRow]:
        if target_date is None:
            target_date = date.today()

        employees = db.query(User).filter(User.role == "Employee").all()
        rows = []
        for emp in employees:
            if not TargetConfigurationService.has_targets(emp.full_name):
                continue
            panel = TargetEngineService.get_today_target_panel(db, emp.id, emp.full_name, target_date)
            logout = TargetEngineService.check_logout(db, emp.id, emp.full_name)
            login_time = TargetEngineService.get_login_time(db, emp.id, target_date)
            last_activity = TargetEngineService.get_last_activity(db, emp.id)

            rows.append(AdminEmployeeGridRow(
                employee_id=emp.id,
                employee_name=emp.full_name,
                today_calls=panel.calls_completed,
                today_leads=panel.leads_completed,
                remaining_calls=panel.calls_remaining,
                remaining_leads=panel.leads_remaining,
                carry_forward_calls=panel.carry_forward_calls,
                carry_forward_leads=panel.carry_forward_leads,
                daily_pct=panel.overall_progress_pct,
                weekly_pct=panel.weekly_progress_pct,
                midweek_pct=panel.midweek_progress_pct,
                status=panel.status,
                zone=panel.zone,
                last_activity=last_activity,
                logout_eligible=logout.can_logout,
                office_login_time=login_time.strftime("%I:%M %p") if login_time else None,
                expected_finish_time=panel.expected_completion_time,
                performance_trend="up" if panel.overall_progress_pct >= 70 else "down",
            ))
        return rows

    @staticmethod
    def get_admin_kpis(db: Session, target_date: Optional[date] = None) -> AdminTargetKPIs:
        if target_date is None:
            target_date = date.today()

        grid = TargetEngineService.get_admin_employee_grid(db, target_date)
        zone_counts = {"green": 0, "yellow": 0, "red": 0, "gray": 0}
        total_calls = 0
        total_leads = 0
        pending_calls = 0
        pending_leads = 0
        cf_calls = 0
        cf_leads = 0
        weekly_pcts = []

        for row in grid:
            zone_counts[row.zone] = zone_counts.get(row.zone, 0) + 1
            total_calls += row.today_calls
            total_leads += row.today_leads
            pending_calls += row.remaining_calls
            pending_leads += row.remaining_leads
            cf_calls += row.carry_forward_calls
            cf_leads += row.carry_forward_leads
            weekly_pcts.append(row.weekly_pct)

        emp_count = len(grid) or 1
        week_start, week_end = TargetEngineService.get_week_range(target_date)

        from .performance_calculation_service import PerformanceCalculationService
        top = PerformanceCalculationService.get_top_performer(db, week_start, week_end)
        lowest = PerformanceCalculationService.get_lowest_performer(db, week_start, week_end)

        return AdminTargetKPIs(
            green_zone_employees=zone_counts["green"],
            yellow_zone_employees=zone_counts["yellow"],
            red_zone_employees=zone_counts["red"],
            gray_zone_employees=zone_counts["gray"],
            highest_performer=top,
            lowest_performer=lowest,
            total_calls_today=total_calls,
            total_leads_today=total_leads,
            weekly_completion_pct=round(sum(weekly_pcts) / emp_count, 1) if weekly_pcts else 0,
            overall_productivity=round((total_calls + total_leads * 5) / emp_count, 1),
            pending_calls=pending_calls,
            pending_leads=pending_leads,
            carry_forward_calls=cf_calls,
            carry_forward_leads=cf_leads,
            avg_calls_per_employee=round(total_calls / emp_count, 1),
            avg_leads_per_employee=round(total_leads / emp_count, 1),
        )

    @staticmethod
    def on_call_added(db: Session, employee_id: UUID, employee_name: str, call_id: str):
        """Real-time update when a call is added"""
        TargetEngineService.get_today_target_panel(db, employee_id, employee_name)
        TargetAuditService.log(
            db, action="call_added", employee_id=employee_id,
            entity_type="call", entity_id=call_id,
        )

    @staticmethod
    def on_lead_added(db: Session, employee_id: UUID, employee_name: str, lead_id: str):
        """Real-time update when a qualified lead is added"""
        TargetEngineService.get_today_target_panel(db, employee_id, employee_name)
        TargetAuditService.log(
            db, action="lead_added", employee_id=employee_id,
            entity_type="lead", entity_id=lead_id,
        )

    @staticmethod
    def process_end_of_day(db: Session) -> dict:
        """End of day: close all employee days and carry forward"""
        employees = db.query(User).filter(User.role == "Employee").all()
        closed = 0
        for emp in employees:
            if TargetConfigurationService.has_targets(emp.full_name):
                CarryForwardService.close_day(db, emp.id, emp.full_name)
                closed += 1
        return {"employees_closed": closed, "date": str(date.today())}

    @staticmethod
    def process_weekly_reset(db: Session) -> dict:
        """Saturday evening: archive week, reset carry-forward"""
        week_start = CarryForwardService.get_week_start(date.today())
        reset_count = CarryForwardService.reset_weekly_carry_forward(db, week_start)

        from .performance_calculation_service import PerformanceCalculationService
        reports = PerformanceCalculationService.calculate_all_employees_weekly_performance(db)

        for report in reports:
            BadgeService.evaluate_weekly_badges(db, report.employee_id, week_start)

        TargetAuditService.log(
            db, action="weekly_reset", details=f"Week reset for {week_start}",
            metadata={"reports": len(reports), "carry_forward_reset": reset_count},
        )
        return {"reports_generated": len(reports), "carry_forward_reset": reset_count}
