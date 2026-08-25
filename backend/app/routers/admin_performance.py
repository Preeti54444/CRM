"""Admin Performance API Router"""
from datetime import datetime, date, timedelta
from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func, and_

from ..database import get_db
from ..models.user import User
from ..schemas.employee_performance import (
    DashboardMetrics,
    EmployeeRanking,
    LogoutOverrideLogCreate,
    LogoutOverrideLog
)
from ..services.performance_calculation_service import PerformanceCalculationService
from ..services.logout_restriction_service import LogoutRestrictionService
from ..services.performance_notification_service import PerformanceNotificationService
from ..services.target_configuration_service import TargetConfigurationService
from ..auth.dependencies import get_current_user


router = APIRouter(prefix="/admin", tags=["Admin Performance"])


def verify_admin(current_user: User = Depends(get_current_user)):
    """Dependency to verify user is admin"""
    if current_user.role != "Admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can access this endpoint"
        )
    return current_user


@router.get("/dashboard", response_model=DashboardMetrics)
async def get_admin_dashboard(
    current_user: User = Depends(verify_admin),
    db: Session = Depends(get_db)
):
    """Get admin dashboard with all metrics"""
    today = date.today()
    week_start, week_end = PerformanceCalculationService.get_week_range()
    
    # Get total calls today
    from ..models.call import Call
    total_calls_today = db.query(Call).filter(
        func.date(Call.created_at) == today
    ).count()
    
    # Get total calls this week
    total_calls_this_week = db.query(Call).filter(
        and_(
            func.date(Call.created_at) >= week_start,
            func.date(Call.created_at) <= week_end
        )
    ).count()
    
    # Get total leads this week
    from ..models.lead import Lead
    total_leads_this_week = db.query(Lead).filter(
        and_(
            func.date(Lead.created_at) >= week_start,
            func.date(Lead.created_at) <= week_end
        )
    ).count()
    
    # Get total exploration calls this week
    exploration_statuses = ["Exploration", "Interested", "Qualified"]
    total_exploration_calls_this_week = db.query(Call).filter(
        and_(
            func.date(Call.created_at) >= week_start,
            func.date(Call.created_at) <= week_end,
            Call.status.in_(exploration_statuses)
        )
    ).count()
    
    # Get total meetings this week
    from ..models.meeting import Meeting
    total_meetings_this_week = db.query(Meeting).filter(
        and_(
            func.date(Meeting.created_at) >= week_start,
            func.date(Meeting.created_at) <= week_end
        )
    ).count()
    
    # Get zone counts
    zone_counts = PerformanceCalculationService.get_zone_counts(db, today)
    
    # Get top performer
    top_performer = PerformanceCalculationService.get_top_performer(db, week_start, week_end)
    
    # Get lowest performer
    lowest_performer = PerformanceCalculationService.get_lowest_performer(db, week_start, week_end)
    
    return DashboardMetrics(
        total_calls_today=total_calls_today,
        total_calls_this_week=total_calls_this_week,
        total_leads_this_week=total_leads_this_week,
        total_exploration_calls_this_week=total_exploration_calls_this_week,
        total_meetings_this_week=total_meetings_this_week,
        green_zone_employees=zone_counts["green"],
        yellow_zone_employees=zone_counts["yellow"],
        red_zone_employees=zone_counts["red"],
        top_performer=top_performer,
        lowest_performer=lowest_performer
    )


@router.get("/employees/performance")
async def get_all_employees_performance(
    current_user: User = Depends(verify_admin),
    db: Session = Depends(get_db),
    performance_date: Optional[date] = None
):
    """Get performance data for all employees"""
    if performance_date is None:
        performance_date = date.today()
    
    from ..models.employee_performance import EmployeePerformanceDaily
    
    performances = db.query(EmployeePerformanceDaily).filter(
        func.date(EmployeePerformanceDaily.date) == performance_date
    ).all()
    
    result = []
    for perf in performances:
        employee = db.query(User).filter(User.id == perf.employee_id).first()
        result.append({
            "id": perf.id,
            "employee_id": str(perf.employee_id),
            "employee_name": employee.full_name if employee else "Unknown",
            "date": perf.date,
            "calls_completed": perf.calls_completed,
            "leads_created": perf.leads_created,
            "exploration_calls": perf.exploration_calls,
            "meetings_booked": perf.meetings_booked,
            "achievement_percentage": perf.achievement_percentage,
            "zone": perf.zone,
            "last_activity": perf.last_activity
        })
    
    return result


@router.get("/midweek-report")
async def get_midweek_report(
    current_user: User = Depends(verify_admin),
    db: Session = Depends(get_db)
):
    """Generate mid-week report for all employees"""
    week_start, week_end = PerformanceCalculationService.get_week_range()
    
    from ..models.employee_performance import EmployeeMidweekReport
    from ..models.user import User
    
    employees = db.query(User).filter(User.role == "Employee").all()
    reports = []
    
    for employee in employees:
        if TargetConfigurationService.has_targets(employee.full_name):
            report = PerformanceCalculationService.calculate_midweek_performance(
                db, employee.id, employee.full_name, week_start, week_end
            )
            
            # Get targets
            targets = TargetConfigurationService.get_weekly_targets(employee.full_name)
            
            reports.append({
                "employee_id": str(report.employee_id),
                "employee_name": employee.full_name,
                "week_start": report.week_start,
                "week_end": report.week_end,
                "weekly_calls_target": targets.get("weekly_calls", 0),
                "calls_completed": report.calls_completed,
                "weekly_leads_target": targets.get("weekly_leads", 0),
                "leads_completed": report.leads_completed,
                "weekly_exploration_target": targets.get("weekly_exploration_calls", 0),
                "exploration_completed": report.exploration_calls_completed,
                "achievement_percentage": report.achievement_percentage,
                "zone": report.zone
            })
    
    return reports


@router.get("/weekly-report")
async def get_weekly_report(
    current_user: User = Depends(verify_admin),
    db: Session = Depends(get_db)
):
    """Generate weekly report for all employees"""
    week_start, week_end = PerformanceCalculationService.get_week_range()
    
    from ..models.employee_performance import EmployeeWeeklyReport
    from ..models.user import User
    
    employees = db.query(User).filter(User.role == "Employee").all()
    reports = []
    
    for employee in employees:
        if TargetConfigurationService.has_targets(employee.full_name):
            report = PerformanceCalculationService.calculate_weekly_performance(
                db, employee.id, employee.full_name, week_start, week_end
            )
            
            reports.append({
                "employee_id": str(report.employee_id),
                "employee_name": employee.full_name,
                "total_calls": report.total_calls,
                "total_leads": report.total_leads,
                "total_exploration_calls": report.total_exploration_calls,
                "total_meetings": report.total_meetings,
                "achievement_percentage": report.achievement_percentage,
                "performance_score": report.performance_score,
                "zone": report.zone,
                "rank": report.rank
            })
    
    # Sort by rank
    reports.sort(key=lambda x: x["rank"] or 999)
    
    return reports


@router.get("/rankings", response_model=List[EmployeeRanking])
async def get_employee_rankings(
    current_user: User = Depends(verify_admin),
    db: Session = Depends(get_db),
    week_start: Optional[date] = None,
    week_end: Optional[date] = None
):
    """Get employee rankings for the week"""
    if week_start is None or week_end is None:
        week_start, week_end = PerformanceCalculationService.get_week_range()
    
    from ..models.employee_performance import EmployeeWeeklyReport
    
    reports = db.query(EmployeeWeeklyReport).filter(
        and_(
            func.date(EmployeeWeeklyReport.week_start) == week_start,
            func.date(EmployeeWeeklyReport.week_end) == week_end
        )
    ).order_by(EmployeeWeeklyReport.performance_score.desc()).all()
    
    rankings = []
    for report in reports:
        employee = db.query(User).filter(User.id == report.employee_id).first()
        rankings.append(EmployeeRanking(
            employee_id=report.employee_id,
            employee_name=employee.full_name if employee else "Unknown",
            calls=report.total_calls,
            leads=report.total_leads,
            exploration_calls=report.total_exploration_calls,
            performance_score=report.performance_score,
            achievement_percentage=report.achievement_percentage,
            rank=report.rank or 0,
            zone=report.zone
        ))
    
    return rankings


@router.post("/logout-override")
async def create_logout_override(
    employee_id: UUID,
    reason: str,
    current_user: User = Depends(verify_admin),
    db: Session = Depends(get_db)
):
    """Admin approves logout override for an employee"""
    employee = db.query(User).filter(User.id == employee_id).first()
    
    if not employee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee not found"
        )
    
    if employee.role != "Employee":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not an employee"
        )
    
    override_log = LogoutRestrictionService.create_logout_override(
        db, employee_id, current_user.id, reason
    )
    
    return {
        "message": "Logout override approved",
        "override_log": {
            "id": override_log.id,
            "employee_id": str(override_log.employee_id),
            "approved_by": str(override_log.approved_by),
            "reason": override_log.reason,
            "calls_completed": override_log.calls_completed,
            "leads_completed": override_log.leads_completed,
            "created_at": override_log.created_at
        }
    }


@router.get("/logout-overrides")
async def get_logout_overrides(
    current_user: User = Depends(verify_admin),
    db: Session = Depends(get_db),
    employee_id: Optional[UUID] = None
):
    """Get logout override logs"""
    return LogoutRestrictionService.get_override_logs(db, employee_id)


@router.get("/targets")
async def get_all_targets(
    current_user: User = Depends(verify_admin)
):
    """Get all employee target configurations"""
    return TargetConfigurationService.get_all_employee_targets()


@router.post("/trigger-morning-check")
async def trigger_morning_target_check(
    current_user: User = Depends(verify_admin),
    db: Session = Depends(get_db)
):
    """Manually trigger morning target check (for testing)"""
    results = PerformanceNotificationService.check_all_employees_morning_targets(db)
    return {
        "message": "Morning target check completed",
        "results": results
    }


@router.post("/trigger-daily-check")
async def trigger_daily_target_check(
    current_user: User = Depends(verify_admin),
    db: Session = Depends(get_db)
):
    """Manually trigger daily target check (for testing)"""
    results = PerformanceNotificationService.check_all_employees_daily_targets(db)
    return {
        "message": "Daily target check completed",
        "results": results
    }


@router.post("/trigger-weekly-report")
async def trigger_weekly_report_generation(
    current_user: User = Depends(verify_admin),
    db: Session = Depends(get_db)
):
    """Manually trigger weekly report generation (for testing)"""
    reports = PerformanceCalculationService.calculate_all_employees_weekly_performance(db)
    
    # Notify all employees
    for report in reports:
        PerformanceNotificationService.notify_weekly_report_generated(db, report.employee_id)
    
    return {
        "message": "Weekly report generation completed",
        "reports_count": len(reports)
    }


@router.post("/trigger-midweek-report")
async def trigger_midweek_report_generation(
    current_user: User = Depends(verify_admin),
    db: Session = Depends(get_db)
):
    """Manually trigger mid-week report generation (for testing)"""
    from ..models.user import User
    
    employees = db.query(User).filter(User.role == "Employee").all()
    reports = []
    
    for employee in employees:
        if TargetConfigurationService.has_targets(employee.full_name):
            report = PerformanceCalculationService.calculate_midweek_performance(
                db, employee.id, employee.full_name
            )
            PerformanceNotificationService.notify_midweek_report_generated(db, employee.id)
            reports.append(report)
    
    return {
        "message": "Mid-week report generation completed",
        "reports_count": len(reports)
    }


@router.get("/charts/daily-trends")
async def get_daily_trends(
    current_user: User = Depends(verify_admin),
    db: Session = Depends(get_db),
    days: int = 7
):
    """Get daily trends for calls, leads, and exploration calls"""
    from ..models.call import Call
    from ..models.lead import Lead
    from datetime import timedelta
    
    trends = []
    exploration_statuses = ["Exploration", "Interested", "Qualified"]
    
    for i in range(days):
        date_obj = date.today() - timedelta(days=days - 1 - i)
        
        calls_count = db.query(Call).filter(
            func.date(Call.created_at) == date_obj
        ).count()
        
        leads_count = db.query(Lead).filter(
            func.date(Lead.created_at) == date_obj
        ).count()
        
        exploration_count = db.query(Call).filter(
            and_(
                func.date(Call.created_at) == date_obj,
                Call.status.in_(exploration_statuses)
            )
        ).count()
        
        trends.append({
            "date": date_obj.strftime("%Y-%m-%d"),
            "calls": calls_count,
            "leads": leads_count,
            "exploration_calls": exploration_count
        })
    
    return trends


@router.get("/charts/weekly-performance")
async def get_weekly_performance_trends(
    current_user: User = Depends(verify_admin),
    db: Session = Depends(get_db),
    weeks: int = 4
):
    """Get weekly performance trends"""
    from ..models.employee_performance import EmployeeWeeklyReport
    
    trends = []
    
    for i in range(weeks):
        week_end = date.today() - timedelta(days=i * 7)
        week_start = week_end - timedelta(days=6)
        
        reports = db.query(EmployeeWeeklyReport).filter(
            and_(
                func.date(EmployeeWeeklyReport.week_start) == week_start,
                func.date(EmployeeWeeklyReport.week_end) == week_end
            )
        ).all()
        
        total_calls = sum(r.total_calls for r in reports)
        total_leads = sum(r.total_leads for r in reports)
        total_exploration = sum(r.total_exploration_calls for r in reports)
        avg_achievement = sum(r.achievement_percentage for r in reports) / len(reports) if reports else 0
        
        trends.append({
            "week_start": week_start.strftime("%Y-%m-%d"),
            "week_end": week_end.strftime("%Y-%m-%d"),
            "total_calls": total_calls,
            "total_leads": total_leads,
            "total_exploration_calls": total_exploration,
            "avg_achievement_percentage": round(avg_achievement, 2)
        })
    
    return trends


@router.get("/charts/target-vs-achievement")
async def get_target_vs_achievement(
    current_user: User = Depends(verify_admin),
    db: Session = Depends(get_db)
):
    """Get target vs achievement comparison for all employees"""
    from ..models.user import User
    
    employees = db.query(User).filter(User.role == "Employee").all()
    comparison = []
    
    for employee in employees:
        if TargetConfigurationService.has_targets(employee.full_name):
            targets = TargetConfigurationService.get_weekly_targets(employee.full_name)
            
            week_start, week_end = PerformanceCalculationService.get_week_range()
            calls_completed = PerformanceCalculationService.get_week_calls(
                db, employee.id, week_start, week_end
            )
            leads_completed = PerformanceCalculationService.get_week_leads(
                db, employee.id, week_start, week_end
            )
            exploration_completed = PerformanceCalculationService.get_week_exploration_calls(
                db, employee.id, week_start, week_end
            )
            
            comparison.append({
                "employee_name": employee.full_name,
                "calls_target": targets.get("weekly_calls", 0),
                "calls_achieved": calls_completed,
                "leads_target": targets.get("weekly_leads", 0),
                "leads_achieved": leads_completed,
                "exploration_target": targets.get("weekly_exploration_calls", 0),
                "exploration_achieved": exploration_completed
            })
    
    return comparison


@router.get("/charts/monthly-achievement")
async def get_monthly_achievement_trends(
    current_user: User = Depends(verify_admin),
    db: Session = Depends(get_db),
    months: int = 6
):
    """Get monthly achievement trends"""
    from ..models.call import Call
    from ..models.lead import Lead
    from datetime import timedelta
    
    trends = []
    
    for i in range(months):
        # Calculate month start and end
        today = date.today()
        month_start = (today.replace(day=1) - timedelta(days=32 * i)).replace(day=1)
        
        # Get first day of next month
        if month_start.month == 12:
            month_end = month_start.replace(year=month_start.year + 1, month=1, day=1) - timedelta(days=1)
        else:
            month_end = month_start.replace(month=month_start.month + 1, day=1) - timedelta(days=1)
        
        calls_count = db.query(Call).filter(
            and_(
                func.date(Call.created_at) >= month_start,
                func.date(Call.created_at) <= month_end
            )
        ).count()
        
        leads_count = db.query(Lead).filter(
            and_(
                func.date(Lead.created_at) >= month_start,
                func.date(Lead.created_at) <= month_end
            )
        ).count()
        
        trends.append({
            "month": month_start.strftime("%Y-%m"),
            "month_name": month_start.strftime("%B %Y"),
            "total_calls": calls_count,
            "total_leads": leads_count
        })
    
    return trends[::-1]  # Reverse to show oldest to newest
