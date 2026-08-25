"""Employee Performance API Router"""
from datetime import datetime, date
from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.user import User
from ..schemas.employee_performance import (
    PerformanceMetrics,
    LogoutCheckResponse,
    EmployeeRanking
)
from ..services.performance_calculation_service import PerformanceCalculationService
from ..services.logout_restriction_service import LogoutRestrictionService
from ..services.performance_notification_service import PerformanceNotificationService
from ..services.target_configuration_service import TargetConfigurationService
from ..auth.dependencies import get_current_user


router = APIRouter(prefix="/employee", tags=["Employee Performance"])


@router.get("/dashboard", response_model=PerformanceMetrics)
async def get_employee_dashboard(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get employee dashboard with performance metrics"""
    if current_user.role != "Employee":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only employees can access this endpoint"
        )
    
    # Get current date and week range
    today = date.today()
    week_start, week_end = PerformanceCalculationService.get_week_range()
    
    # Get today's metrics
    today_calls = PerformanceCalculationService.get_today_calls(db, current_user.id)
    today_leads = PerformanceCalculationService.get_today_leads(db, current_user.id)
    today_exploration_calls = PerformanceCalculationService.get_today_exploration_calls(db, current_user.id)
    today_meetings = PerformanceCalculationService.get_today_meetings(db, current_user.id)
    
    # Get weekly metrics
    weekly_calls = PerformanceCalculationService.get_week_calls(db, current_user.id, week_start, week_end)
    weekly_leads = PerformanceCalculationService.get_week_leads(db, current_user.id, week_start, week_end)
    weekly_exploration_calls = PerformanceCalculationService.get_week_exploration_calls(db, current_user.id, week_start, week_end)
    weekly_meetings = PerformanceCalculationService.get_week_meetings(db, current_user.id, week_start, week_end)
    
    # Get targets
    daily_targets = TargetConfigurationService.get_daily_targets(current_user.full_name)
    weekly_targets = TargetConfigurationService.get_weekly_targets(current_user.full_name)
    
    # Calculate achievements
    daily_achievement_percentage = PerformanceCalculationService.calculate_achievement_percentage(
        today_calls, daily_targets.get("daily_calls", 0)
    )
    
    weekly_achievement_percentage = PerformanceCalculationService.calculate_achievement_percentage(
        weekly_calls, weekly_targets.get("weekly_calls", 0)
    )
    
    # Calculate performance score
    call_achievement = PerformanceCalculationService.calculate_achievement_percentage(
        weekly_calls, weekly_targets.get("weekly_calls", 0)
    )
    lead_achievement = PerformanceCalculationService.calculate_achievement_percentage(
        weekly_leads, weekly_targets.get("weekly_leads", 0)
    )
    exploration_achievement = PerformanceCalculationService.calculate_achievement_percentage(
        weekly_exploration_calls, weekly_targets.get("weekly_exploration_calls", 0)
    )
    
    performance_score = PerformanceCalculationService.calculate_performance_score(
        call_achievement, lead_achievement, exploration_achievement
    )
    
    # Determine zone
    zone = PerformanceCalculationService.calculate_zone(weekly_achievement_percentage)
    
    return PerformanceMetrics(
        employee_id=current_user.id,
        employee_name=current_user.full_name,
        date=datetime.combine(today, datetime.min.time()),
        today_calls=today_calls,
        today_leads=today_leads,
        today_exploration_calls=today_exploration_calls,
        today_meetings=today_meetings,
        weekly_calls=weekly_calls,
        weekly_leads=weekly_leads,
        weekly_exploration_calls=weekly_exploration_calls,
        weekly_meetings=weekly_meetings,
        daily_achievement_percentage=daily_achievement_percentage,
        weekly_achievement_percentage=weekly_achievement_percentage,
        performance_score=performance_score,
        zone=zone,
        morning_calls_target=daily_targets.get("morning_calls", 0),
        morning_leads_target=daily_targets.get("morning_leads", 0),
        daily_calls_target=daily_targets.get("daily_calls", 0),
        daily_leads_target=daily_targets.get("daily_leads", 0),
        weekly_calls_target=weekly_targets.get("weekly_calls", 0),
        weekly_leads_target=weekly_targets.get("weekly_leads", 0),
        weekly_exploration_calls_target=weekly_targets.get("weekly_exploration_calls", 0)
    )


@router.post("/logout-check", response_model=LogoutCheckResponse)
async def check_logout_permission(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Check if employee can logout based on daily target completion"""
    if current_user.role != "Employee":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only employees can access this endpoint"
        )
    
    return LogoutRestrictionService.check_logout_permission(
        db, current_user.id, current_user.full_name
    )


@router.get("/performance")
async def get_employee_performance(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get detailed employee performance data"""
    if current_user.role != "Employee":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only employees can access this endpoint"
        )
    
    # Calculate current performance
    performance = PerformanceCalculationService.calculate_daily_performance(
        db, current_user.id, current_user.full_name
    )
    
    return {
        "id": performance.id,
        "employee_id": str(performance.employee_id),
        "date": performance.date,
        "calls_completed": performance.calls_completed,
        "leads_created": performance.leads_created,
        "exploration_calls": performance.exploration_calls,
        "meetings_booked": performance.meetings_booked,
        "achievement_percentage": performance.achievement_percentage,
        "zone": performance.zone,
        "last_activity": performance.last_activity,
        "created_at": performance.created_at,
        "updated_at": performance.updated_at
    }


@router.get("/midweek-report")
async def get_employee_midweek_report(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get employee mid-week report"""
    if current_user.role != "Employee":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only employees can access this endpoint"
        )
    
    week_start, week_end = PerformanceCalculationService.get_week_range()
    
    report = PerformanceCalculationService.calculate_midweek_performance(
        db, current_user.id, current_user.full_name, week_start, week_end
    )
    
    return {
        "id": report.id,
        "employee_id": str(report.employee_id),
        "week_start": report.week_start,
        "week_end": report.week_end,
        "calls_completed": report.calls_completed,
        "leads_completed": report.leads_completed,
        "exploration_calls_completed": report.exploration_calls_completed,
        "achievement_percentage": report.achievement_percentage,
        "zone": report.zone,
        "generated_at": report.generated_at
    }


@router.get("/weekly-report")
async def get_employee_weekly_report(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get employee weekly report"""
    if current_user.role != "Employee":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only employees can access this endpoint"
        )
    
    week_start, week_end = PerformanceCalculationService.get_week_range()
    
    report = PerformanceCalculationService.calculate_weekly_performance(
        db, current_user.id, current_user.full_name, week_start, week_end
    )
    
    return {
        "id": report.id,
        "employee_id": str(report.employee_id),
        "week_start": report.week_start,
        "week_end": report.week_end,
        "total_calls": report.total_calls,
        "total_leads": report.total_leads,
        "total_exploration_calls": report.total_exploration_calls,
        "total_meetings": report.total_meetings,
        "achievement_percentage": report.achievement_percentage,
        "performance_score": report.performance_score,
        "zone": report.zone,
        "rank": report.rank,
        "generated_at": report.generated_at
    }


@router.get("/notifications")
async def get_employee_notifications(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    unread_only: bool = False
):
    """Get employee notifications"""
    if str(current_user.role).lower() != "employee":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only employees can access this endpoint"
        )
    
    if unread_only:
        notifications = PerformanceNotificationService.get_unread_notifications(db, current_user.id)
    else:
        from ..models.notification import Notification
        notifications = db.query(Notification).filter(
            Notification.user_id == current_user.id
        ).order_by(Notification.created_at.desc()).all()
    
    return [
        {
            "id": notif.id,
            "title": notif.title,
            "message": notif.message,
            "type": notif.type,
            "is_read": notif.is_read,
            "created_at": notif.created_at
        }
        for notif in notifications
    ]


@router.post("/notifications/{notification_id}/read")
async def mark_notification_read(
    notification_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Mark a notification as read"""
    if str(current_user.role).lower() != "employee":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only employees can access this endpoint"
        )
    
    notification = PerformanceNotificationService.mark_notification_read(db, notification_id)
    
    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found"
        )
    
    return {"message": "Notification marked as read"}


@router.post("/notifications/read-all")
async def mark_all_notifications_read(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Mark all notifications as read"""
    if str(current_user.role).lower() != "employee":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only employees can access this endpoint"
        )
    
    count = PerformanceNotificationService.mark_all_notifications_read(db, current_user.id)
    
    return {"message": f"Marked {count} notifications as read"}


@router.delete("/notifications")
async def delete_all_notifications(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete all notifications for the current employee"""
    if str(current_user.role).lower() != "employee":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only employees can access this endpoint"
        )

    deleted_count = PerformanceNotificationService.delete_all_notifications(db, current_user.id)
    return {"deleted": deleted_count}


@router.get("/notifications/unread-count")
async def get_unread_notification_count(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get count of unread notifications"""
    if str(current_user.role).lower() != "employee":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only employees can access this endpoint"
        )
    
    count = PerformanceNotificationService.get_unread_count(db, current_user.id)
    
    return {"unread_count": count}
