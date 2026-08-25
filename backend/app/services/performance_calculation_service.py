"""Performance Calculation Engine Service"""
from datetime import datetime, date, timedelta
from typing import Dict, List, Optional
from uuid import UUID
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_

from ..models.employee_performance import (
    EmployeePerformanceDaily,
    EmployeeMidweekReport,
    EmployeeWeeklyReport
)
from ..models.call import Call
from ..models.lead import Lead
from ..models.meeting import Meeting
from ..models.user import User
from .target_configuration_service import TargetConfigurationService


class PerformanceCalculationService:
    """Service for automated performance calculation"""
    
    @staticmethod
    def calculate_achievement_percentage(
        completed: int,
        target: int
    ) -> float:
        """Calculate achievement percentage"""
        if target == 0:
            return 0.0
        return round((completed / target) * 100, 2)
    
    @staticmethod
    def calculate_zone(achievement_percentage: float, has_activity: bool = True) -> str:
        """Determine performance zone based on achievement"""
        if not has_activity:
            return "gray"
        if achievement_percentage >= 100:
            return "green"
        elif achievement_percentage >= 70:
            return "yellow"
        else:
            return "red"
    
    @staticmethod
    def calculate_performance_score(
        call_achievement: float,
        lead_achievement: float,
        exploration_achievement: float
    ) -> float:
        """
        Calculate final performance score using weighted formula:
        Call Achievement × 40% + Lead Achievement × 40% + Exploration Achievement × 20%
        """
        return round(
            (call_achievement * 0.4) +
            (lead_achievement * 0.4) +
            (exploration_achievement * 0.2),
            2
        )
    
    @staticmethod
    def get_today_calls(db: Session, employee_id: UUID) -> int:
        """Get count of outbound calls made today by employee"""
        from .target_engine_service import TargetEngineService
        return TargetEngineService.get_outbound_calls(db, employee_id, date.today())
    
    @staticmethod
    def get_today_leads(db: Session, employee_id: UUID) -> int:
        """Get count of qualified leads created today by employee"""
        from .target_engine_service import TargetEngineService
        return TargetEngineService.get_qualified_leads(db, employee_id, date.today())
    
    @staticmethod
    def get_today_exploration_calls(db: Session, employee_id: UUID) -> int:
        """Get count of exploration calls today by employee"""
        today = date.today()
        # Exploration calls are identified by status/disposition
        exploration_statuses = ["Exploration", "Interested", "Qualified"]
        return db.query(Call).filter(
            and_(
                Call.created_by == employee_id,
                func.date(Call.created_at) == today,
                Call.status.in_(exploration_statuses)
            )
        ).count()
    
    @staticmethod
    def get_today_meetings(db: Session, employee_id: UUID) -> int:
        """Get count of meetings booked today by employee"""
        today = date.today()
        return db.query(Meeting).filter(
            and_(
                func.date(Meeting.created_at) == today
            )
        ).join(Lead, Meeting.lead_id == Lead.id).filter(
            Lead.created_by == employee_id
        ).count()
    
    @staticmethod
    def get_week_calls(db: Session, employee_id: UUID, week_start: date, week_end: date) -> int:
        """Get count of outbound calls in a week by employee"""
        from .target_engine_service import TargetEngineService
        return TargetEngineService.get_period_calls(db, employee_id, week_start, week_end)
    
    @staticmethod
    def get_week_leads(db: Session, employee_id: UUID, week_start: date, week_end: date) -> int:
        """Get count of qualified leads in a week by employee"""
        from .target_engine_service import TargetEngineService
        return TargetEngineService.get_period_leads(db, employee_id, week_start, week_end)
    
    @staticmethod
    def get_week_exploration_calls(db: Session, employee_id: UUID, week_start: date, week_end: date) -> int:
        """Get count of exploration calls in a week by employee"""
        exploration_statuses = ["Exploration", "Interested", "Qualified"]
        return db.query(Call).filter(
            and_(
                Call.created_by == employee_id,
                func.date(Call.created_at) >= week_start,
                func.date(Call.created_at) <= week_end,
                Call.status.in_(exploration_statuses)
            )
        ).count()
    
    @staticmethod
    def get_week_meetings(db: Session, employee_id: UUID, week_start: date, week_end: date) -> int:
        """Get count of meetings booked in a week by employee"""
        return db.query(Meeting).filter(
            and_(
                func.date(Meeting.created_at) >= week_start,
                func.date(Meeting.created_at) <= week_end
            )
        ).join(Lead, Meeting.lead_id == Lead.id).filter(
            Lead.created_by == employee_id
        ).count()
    
    @staticmethod
    def get_week_range(week_date: Optional[date] = None) -> tuple[date, date]:
        """Get week start (Monday) and end (Saturday) for a given date"""
        if week_date is None:
            week_date = date.today()
        start_of_week = week_date - timedelta(days=week_date.weekday())
        end_of_week = start_of_week + timedelta(days=5)
        return start_of_week, end_of_week
    
    @staticmethod
    def calculate_daily_performance(
        db: Session,
        employee_id: UUID,
        employee_name: str,
        performance_date: Optional[date] = None
    ) -> EmployeePerformanceDaily:
        """Calculate and store daily performance for an employee"""
        if performance_date is None:
            performance_date = date.today()
        
        # Get today's metrics
        calls_completed = PerformanceCalculationService.get_today_calls(db, employee_id)
        leads_created = PerformanceCalculationService.get_today_leads(db, employee_id)
        exploration_calls = PerformanceCalculationService.get_today_exploration_calls(db, employee_id)
        meetings_booked = PerformanceCalculationService.get_today_meetings(db, employee_id)
        
        # Get targets
        targets = TargetConfigurationService.get_daily_targets(employee_name)
        daily_calls_target = targets.get("daily_calls", 0)
        daily_leads_target = targets.get("daily_leads", 0)
        
        # Calculate achievement percentages
        call_achievement = PerformanceCalculationService.calculate_achievement_percentage(
            calls_completed, daily_calls_target
        )
        lead_achievement = PerformanceCalculationService.calculate_achievement_percentage(
            leads_created, daily_leads_target
        )
        
        # For daily, we use weighted average of calls and leads
        achievement_percentage = round((call_achievement + lead_achievement) / 2, 2)
        has_activity = calls_completed > 0 or leads_created > 0
        zone = PerformanceCalculationService.calculate_zone(achievement_percentage, has_activity)
        
        # Check if record exists
        existing = db.query(EmployeePerformanceDaily).filter(
            and_(
                EmployeePerformanceDaily.employee_id == employee_id,
                func.date(EmployeePerformanceDaily.date) == performance_date
            )
        ).first()
        
        if existing:
            # Update existing record
            existing.calls_completed = calls_completed
            existing.leads_created = leads_created
            existing.exploration_calls = exploration_calls
            existing.meetings_booked = meetings_booked
            existing.achievement_percentage = achievement_percentage
            existing.zone = zone
            existing.last_activity = datetime.utcnow()
            db.commit()
            db.refresh(existing)
            return existing
        else:
            # Create new record
            performance = EmployeePerformanceDaily(
                employee_id=employee_id,
                date=datetime.combine(performance_date, datetime.min.time()),
                calls_completed=calls_completed,
                leads_created=leads_created,
                exploration_calls=exploration_calls,
                meetings_booked=meetings_booked,
                achievement_percentage=achievement_percentage,
                zone=zone,
                last_activity=datetime.utcnow()
            )
            db.add(performance)
            db.commit()
            db.refresh(performance)
            return performance
    
    @staticmethod
    def calculate_weekly_performance(
        db: Session,
        employee_id: UUID,
        employee_name: str,
        week_start: Optional[date] = None,
        week_end: Optional[date] = None
    ) -> EmployeeWeeklyReport:
        """Calculate and store weekly performance for an employee"""
        if week_start is None or week_end is None:
            week_start, week_end = PerformanceCalculationService.get_week_range()
        
        # Get weekly metrics
        total_calls = PerformanceCalculationService.get_week_calls(db, employee_id, week_start, week_end)
        total_leads = PerformanceCalculationService.get_week_leads(db, employee_id, week_start, week_end)
        total_exploration_calls = PerformanceCalculationService.get_week_exploration_calls(
            db, employee_id, week_start, week_end
        )
        total_meetings = PerformanceCalculationService.get_week_meetings(db, employee_id, week_start, week_end)
        
        # Get targets
        targets = TargetConfigurationService.get_weekly_targets(employee_name)
        weekly_calls_target = targets.get("weekly_calls", 0)
        weekly_leads_target = targets.get("weekly_leads", 0)
        weekly_exploration_calls_target = targets.get("weekly_exploration_calls", 0)
        
        # Calculate achievement percentages
        call_achievement = PerformanceCalculationService.calculate_achievement_percentage(
            total_calls, weekly_calls_target
        )
        lead_achievement = PerformanceCalculationService.calculate_achievement_percentage(
            total_leads, weekly_leads_target
        )
        exploration_achievement = PerformanceCalculationService.calculate_achievement_percentage(
            total_exploration_calls, weekly_exploration_calls_target
        )
        
        # Calculate performance score using weighted formula
        performance_score = PerformanceCalculationService.calculate_performance_score(
            call_achievement, lead_achievement, exploration_achievement
        )
        
        # Calculate overall achievement percentage
        achievement_percentage = round(
            (call_achievement + lead_achievement) / 2, 2
        )
        zone = PerformanceCalculationService.calculate_zone(
            achievement_percentage, total_calls > 0 or total_leads > 0
        )
        
        # Check if report exists
        existing = db.query(EmployeeWeeklyReport).filter(
            and_(
                EmployeeWeeklyReport.employee_id == employee_id,
                func.date(EmployeeWeeklyReport.week_start) == week_start,
                func.date(EmployeeWeeklyReport.week_end) == week_end
            )
        ).first()
        
        if existing:
            # Update existing report
            existing.total_calls = total_calls
            existing.total_leads = total_leads
            existing.total_exploration_calls = total_exploration_calls
            existing.total_meetings = total_meetings
            existing.achievement_percentage = achievement_percentage
            existing.performance_score = performance_score
            existing.zone = zone
            db.commit()
            db.refresh(existing)
            return existing
        else:
            # Create new report
            report = EmployeeWeeklyReport(
                employee_id=employee_id,
                week_start=datetime.combine(week_start, datetime.min.time()),
                week_end=datetime.combine(week_end, datetime.min.time()),
                total_calls=total_calls,
                total_leads=total_leads,
                total_exploration_calls=total_exploration_calls,
                total_meetings=total_meetings,
                achievement_percentage=achievement_percentage,
                performance_score=performance_score,
                zone=zone
            )
            db.add(report)
            db.commit()
            db.refresh(report)
            return report
    
    @staticmethod
    def calculate_midweek_performance(
        db: Session,
        employee_id: UUID,
        employee_name: str,
        week_start: Optional[date] = None,
        week_end: Optional[date] = None
    ) -> EmployeeMidweekReport:
        """Calculate and store mid-week performance for an employee"""
        if week_start is None or week_end is None:
            week_start, week_end = PerformanceCalculationService.get_week_range()
        
        # Get targets (mid-week uses Mon-Wed targets)
        targets = TargetConfigurationService.get_midweek_targets(employee_name)
        midweek_calls_target = targets.get("midweek_calls", 0)
        midweek_leads_target = targets.get("midweek_leads", 0)
        
        # Get mid-week metrics (Mon-Wed only)
        from .target_engine_service import TargetEngineService
        mw_start, mw_end = TargetEngineService.get_midweek_range()
        calls_completed = PerformanceCalculationService.get_week_calls(db, employee_id, mw_start, min(mw_end, date.today()))
        leads_completed = PerformanceCalculationService.get_week_leads(db, employee_id, mw_start, min(mw_end, date.today()))
        exploration_calls_completed = PerformanceCalculationService.get_week_exploration_calls(
            db, employee_id, mw_start, min(mw_end, date.today())
        )
        
        # Calculate achievement percentages
        call_achievement = PerformanceCalculationService.calculate_achievement_percentage(
            calls_completed, midweek_calls_target
        )
        lead_achievement = PerformanceCalculationService.calculate_achievement_percentage(
            leads_completed, midweek_leads_target
        )
        exploration_achievement = PerformanceCalculationService.calculate_achievement_percentage(
            exploration_calls_completed, 0
        )
        
        # Calculate overall achievement percentage
        achievement_percentage = round(
            (call_achievement + lead_achievement) / 2, 2
        )
        zone = PerformanceCalculationService.calculate_zone(
            achievement_percentage, calls_completed > 0 or leads_completed > 0
        )
        
        # Check if report exists
        existing = db.query(EmployeeMidweekReport).filter(
            and_(
                EmployeeMidweekReport.employee_id == employee_id,
                func.date(EmployeeMidweekReport.week_start) == week_start,
                func.date(EmployeeMidweekReport.week_end) == week_end
            )
        ).first()
        
        if existing:
            # Update existing report
            existing.calls_completed = calls_completed
            existing.leads_completed = leads_completed
            existing.exploration_calls_completed = exploration_calls_completed
            existing.achievement_percentage = achievement_percentage
            existing.zone = zone
            db.commit()
            db.refresh(existing)
            return existing
        else:
            # Create new report
            report = EmployeeMidweekReport(
                employee_id=employee_id,
                week_start=datetime.combine(week_start, datetime.min.time()),
                week_end=datetime.combine(week_end, datetime.min.time()),
                calls_completed=calls_completed,
                leads_completed=leads_completed,
                exploration_calls_completed=exploration_calls_completed,
                achievement_percentage=achievement_percentage,
                zone=zone
            )
            db.add(report)
            db.commit()
            db.refresh(report)
            return report
    
    @staticmethod
    def calculate_all_employees_daily_performance(db: Session) -> List[EmployeePerformanceDaily]:
        """Calculate daily performance for all employees"""
        employees = db.query(User).filter(User.role == "Employee").all()
        performances = []
        
        for employee in employees:
            if TargetConfigurationService.has_targets(employee.full_name):
                performance = PerformanceCalculationService.calculate_daily_performance(
                    db, employee.id, employee.full_name
                )
                performances.append(performance)
        
        return performances
    
    @staticmethod
    def calculate_all_employees_weekly_performance(db: Session) -> List[EmployeeWeeklyReport]:
        """Calculate weekly performance for all employees"""
        employees = db.query(User).filter(User.role == "Employee").all()
        reports = []
        
        for employee in employees:
            if TargetConfigurationService.has_targets(employee.full_name):
                report = PerformanceCalculationService.calculate_weekly_performance(
                    db, employee.id, employee.full_name
                )
                reports.append(report)
        
        # Calculate rankings
        PerformanceCalculationService.calculate_rankings(db, reports)
        
        return reports
    
    @staticmethod
    def calculate_rankings(db: Session, reports: List[EmployeeWeeklyReport]) -> None:
        """Calculate and update employee rankings based on weekly performance"""
        # Sort by performance score (descending)
        sorted_reports = sorted(
            reports,
            key=lambda r: r.performance_score,
            reverse=True
        )
        
        # Update ranks
        for rank, report in enumerate(sorted_reports, start=1):
            report.rank = rank
        
        db.commit()
    
    @staticmethod
    def get_top_performer(db: Session, week_start: Optional[date] = None, week_end: Optional[date] = None) -> Optional[Dict]:
        """Get top performer for the week"""
        if week_start is None or week_end is None:
            week_start, week_end = PerformanceCalculationService.get_week_range()
        
        report = db.query(EmployeeWeeklyReport).filter(
            and_(
                func.date(EmployeeWeeklyReport.week_start) == week_start,
                func.date(EmployeeWeeklyReport.week_end) == week_end
            )
        ).order_by(EmployeeWeeklyReport.performance_score.desc()).first()
        
        if not report:
            return None
        
        employee = db.query(User).filter(User.id == report.employee_id).first()
        
        return {
            "employee_id": str(report.employee_id),
            "employee_name": employee.full_name if employee else "Unknown",
            "calls": report.total_calls,
            "leads": report.total_leads,
            "exploration_calls": report.total_exploration_calls,
            "performance_score": report.performance_score,
            "achievement_percentage": report.achievement_percentage,
            "rank": report.rank,
            "zone": report.zone
        }
    
    @staticmethod
    def get_lowest_performer(db: Session, week_start: Optional[date] = None, week_end: Optional[date] = None) -> Optional[Dict]:
        """Get lowest performer for the week"""
        if week_start is None or week_end is None:
            week_start, week_end = PerformanceCalculationService.get_week_range()
        
        report = db.query(EmployeeWeeklyReport).filter(
            and_(
                func.date(EmployeeWeeklyReport.week_start) == week_start,
                func.date(EmployeeWeeklyReport.week_end) == week_end
            )
        ).order_by(EmployeeWeeklyReport.achievement_percentage.asc()).first()
        
        if not report:
            return None
        
        employee = db.query(User).filter(User.id == report.employee_id).first()
        
        return {
            "employee_id": str(report.employee_id),
            "employee_name": employee.full_name if employee else "Unknown",
            "calls": report.total_calls,
            "leads": report.total_leads,
            "exploration_calls": report.total_exploration_calls,
            "zone": report.zone
        }
    
    @staticmethod
    def get_zone_counts(db: Session, performance_date: Optional[date] = None) -> Dict[str, int]:
        """Get count of employees in each zone for a given date"""
        if performance_date is None:
            performance_date = date.today()
        
        green_count = db.query(EmployeePerformanceDaily).filter(
            and_(
                func.date(EmployeePerformanceDaily.date) == performance_date,
                EmployeePerformanceDaily.zone == "green"
            )
        ).count()
        
        yellow_count = db.query(EmployeePerformanceDaily).filter(
            and_(
                func.date(EmployeePerformanceDaily.date) == performance_date,
                EmployeePerformanceDaily.zone == "yellow"
            )
        ).count()
        
        red_count = db.query(EmployeePerformanceDaily).filter(
            and_(
                func.date(EmployeePerformanceDaily.date) == performance_date,
                EmployeePerformanceDaily.zone == "red"
            )
        ).count()
        
        return {
            "green": green_count,
            "yellow": yellow_count,
            "red": red_count
        }
