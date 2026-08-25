"""Badge Service - Automatic achievement badges"""
from datetime import date
from typing import List
from uuid import UUID
from sqlalchemy.orm import Session
from sqlalchemy import and_, func

from ..models.target_management import EmployeeBadge
from ..models.employee_performance import EmployeeWeeklyReport, EmployeePerformanceDaily
from ..models.activity_log import ActivityLog
from .target_audit_service import TargetAuditService


BADGE_DEFINITIONS = {
    "call_champion": {"name": "Call Champion", "description": "Completed 200+ calls in a week"},
    "lead_generator": {"name": "Lead Generator", "description": "Generated 20+ qualified leads in a week"},
    "top_performer": {"name": "Top Performer", "description": "Ranked #1 for the week"},
    "weekly_star": {"name": "Weekly Star", "description": "100% weekly target achievement"},
    "perfect_attendance": {"name": "Perfect Attendance", "description": "Logged in every working day"},
    "target_master": {"name": "Target Master", "description": "Met daily targets 5 days in a row"},
    "hundred_percent": {"name": "100% Achiever", "description": "100% daily target completion"},
}


class BadgeService:
    """Award and manage employee achievement badges"""

    @staticmethod
    def _has_badge(db: Session, employee_id: UUID, badge_type: str, week_start: date = None) -> bool:
        query = db.query(EmployeeBadge).filter(
            and_(
                EmployeeBadge.employee_id == employee_id,
                EmployeeBadge.badge_type == badge_type,
            )
        )
        if week_start:
            query = query.filter(EmployeeBadge.week_start == week_start)
        return query.first() is not None

    @staticmethod
    def award_badge(
        db: Session,
        employee_id: UUID,
        badge_type: str,
        week_start: date = None,
    ) -> EmployeeBadge | None:
        if badge_type not in BADGE_DEFINITIONS:
            return None
        if BadgeService._has_badge(db, employee_id, badge_type, week_start):
            return None

        defn = BADGE_DEFINITIONS[badge_type]
        badge = EmployeeBadge(
            employee_id=employee_id,
            badge_type=badge_type,
            badge_name=defn["name"],
            description=defn["description"],
            week_start=week_start,
        )
        db.add(badge)
        db.commit()
        db.refresh(badge)

        TargetAuditService.log(
            db,
            action="badge_awarded",
            employee_id=employee_id,
            entity_type="badge",
            entity_id=badge_type,
            details=f"Earned badge: {defn['name']}",
        )
        return badge

    @staticmethod
    def evaluate_weekly_badges(db: Session, employee_id: UUID, week_start: date) -> List[EmployeeBadge]:
        awarded = []
        report = db.query(EmployeeWeeklyReport).filter(
            and_(
                EmployeeWeeklyReport.employee_id == employee_id,
                func.date(EmployeeWeeklyReport.week_start) == week_start,
            )
        ).first()
        if not report:
            return awarded

        if report.total_calls >= 200:
            b = BadgeService.award_badge(db, employee_id, "call_champion", week_start)
            if b:
                awarded.append(b)
        if report.total_leads >= 20:
            b = BadgeService.award_badge(db, employee_id, "lead_generator", week_start)
            if b:
                awarded.append(b)
        if report.achievement_percentage >= 100:
            b = BadgeService.award_badge(db, employee_id, "weekly_star", week_start)
            if b:
                awarded.append(b)
        if report.rank == 1:
            b = BadgeService.award_badge(db, employee_id, "top_performer", week_start)
            if b:
                awarded.append(b)
        return awarded

    @staticmethod
    def evaluate_daily_badges(db: Session, employee_id: UUID, perf_date: date) -> List[EmployeeBadge]:
        awarded = []
        perf = db.query(EmployeePerformanceDaily).filter(
            and_(
                EmployeePerformanceDaily.employee_id == employee_id,
                func.date(EmployeePerformanceDaily.date) == perf_date,
            )
        ).first()
        if perf and perf.achievement_percentage >= 100:
            b = BadgeService.award_badge(db, employee_id, "hundred_percent", perf_date)
            if b:
                awarded.append(b)
        return awarded

    @staticmethod
    def get_employee_badges(db: Session, employee_id: UUID, limit: int = 20) -> List[dict]:
        badges = db.query(EmployeeBadge).filter(
            EmployeeBadge.employee_id == employee_id
        ).order_by(EmployeeBadge.earned_at.desc()).limit(limit).all()
        return [
            {
                "id": b.id,
                "badge_type": b.badge_type,
                "badge_name": b.badge_name,
                "description": b.description,
                "earned_at": b.earned_at,
            }
            for b in badges
        ]
