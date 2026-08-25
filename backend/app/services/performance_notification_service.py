"""Performance Notification Service"""
from datetime import datetime
from typing import List
from uuid import UUID
from sqlalchemy.orm import Session
from sqlalchemy import func, and_

from ..models.notification import Notification
from ..models.notification_event import NotificationEvent
from ..models.employee_performance import EmployeePerformanceDaily
from ..models.user import User
from .target_configuration_service import TargetConfigurationService
from .performance_calculation_service import PerformanceCalculationService


class PerformanceNotificationService:
    """Service for creating performance-related notifications"""
    
    @staticmethod
    def create_notification(
        db: Session,
        employee_id: UUID,
        title: str,
        message: str,
        notification_type: str = "performance"
    ) -> Notification:
        """Create a notification for an employee"""
        notification = Notification(
            user_id=employee_id,
            title=title,
            message=message,
            type=notification_type,
            is_read=False
        )
        db.add(notification)
        db.commit()
        db.refresh(notification)
        return notification
    
    @staticmethod
    def check_morning_target(db: Session, employee_id: UUID, employee_name: str) -> bool:
        """Check if morning target is met and create notification if not"""
        # Get morning targets
        targets = TargetConfigurationService.get_morning_targets(employee_name)
        morning_calls_target = targets.get("morning_calls", 0)
        morning_leads_target = targets.get("morning_leads", 0)
        
        # Get today's metrics
        calls_completed = PerformanceCalculationService.get_today_calls(db, employee_id)
        leads_created = PerformanceCalculationService.get_today_leads(db, employee_id)
        
        # Check if target is met
        target_met = (
            calls_completed >= morning_calls_target and
            leads_created >= morning_leads_target
        )
        
        if not target_met:
            # Create notification
            PerformanceNotificationService.create_notification(
                db,
                employee_id,
                "Morning Target Missed",
                "You have not completed your morning target. Please increase activity.",
                "performance"
            )
            
            # Update zone to red
            today = datetime.utcnow().date()
            performance = db.query(EmployeePerformanceDaily).filter(
                and_(
                    EmployeePerformanceDaily.employee_id == employee_id,
                    func.date(EmployeePerformanceDaily.date) == today
                )
            ).first()
            
            if performance:
                performance.zone = "red"
                db.commit()
        
        return target_met
    
    @staticmethod
    def check_daily_target(db: Session, employee_id: UUID, employee_name: str) -> bool:
        """Check if daily target is met and create notification if not"""
        # Get daily targets
        targets = TargetConfigurationService.get_daily_targets(employee_name)
        daily_calls_target = targets.get("daily_calls", 0)
        daily_leads_target = targets.get("daily_leads", 0)
        
        # Get today's metrics
        calls_completed = PerformanceCalculationService.get_today_calls(db, employee_id)
        leads_created = PerformanceCalculationService.get_today_leads(db, employee_id)
        
        # Check if target is met
        target_met = (
            calls_completed >= daily_calls_target and
            leads_created >= daily_leads_target
        )
        
        if not target_met:
            # Create notification
            PerformanceNotificationService.create_notification(
                db,
                employee_id,
                "Daily Target Missed",
                "Your daily target has not been completed.",
                "performance"
            )
        
        return target_met
    
    @staticmethod
    def notify_midweek_report_generated(db: Session, employee_id: UUID) -> None:
        """Notify employee that mid-week report has been generated"""
        PerformanceNotificationService.create_notification(
            db,
            employee_id,
            "Mid Week Report Generated",
            "Your mid-week performance report is now available.",
            "report"
        )
    
    @staticmethod
    def notify_weekly_report_generated(db: Session, employee_id: UUID) -> None:
        """Notify employee that weekly report has been generated"""
        PerformanceNotificationService.create_notification(
            db,
            employee_id,
            "Weekly Report Generated",
            "Your weekly performance report is now available.",
            "report"
        )
    
    @staticmethod
    def notify_admin_override_approved(db: Session, employee_id: UUID, admin_name: str) -> None:
        """Notify employee that admin has approved their logout override"""
        PerformanceNotificationService.create_notification(
            db,
            employee_id,
            "Admin Override Approved",
            f"Admin {admin_name} has approved your logout request.",
            "override"
        )
    
    @staticmethod
    def notify_admin_override_request(db: Session, admin_id: UUID, employee_name: str) -> None:
        """Notify admin of logout override request"""
        PerformanceNotificationService.create_notification(
            db,
            admin_id,
            "Logout Override Request",
            f"Employee {employee_name} has requested a logout override.",
            "override_request"
        )
    
    @staticmethod
    def check_all_employees_morning_targets(db: Session) -> List[dict]:
        """Check morning targets for all employees"""
        employees = db.query(User).filter(User.role == "Employee").all()
        results = []
        
        for employee in employees:
            if TargetConfigurationService.has_targets(employee.full_name):
                target_met = PerformanceNotificationService.check_morning_target(
                    db, employee.id, employee.full_name
                )
                results.append({
                    "employee_id": str(employee.id),
                    "employee_name": employee.full_name,
                    "target_met": target_met
                })
        
        return results
    
    @staticmethod
    def check_all_employees_daily_targets(db: Session) -> List[dict]:
        """Check daily targets for all employees"""
        employees = db.query(User).filter(User.role == "Employee").all()
        results = []
        
        for employee in employees:
            if TargetConfigurationService.has_targets(employee.full_name):
                target_met = PerformanceNotificationService.check_daily_target(
                    db, employee.id, employee.full_name
                )
                results.append({
                    "employee_id": str(employee.id),
                    "employee_name": employee.full_name,
                    "target_met": target_met
                })
        
        return results
    
    @staticmethod
    def get_unread_notifications(db: Session, employee_id: UUID) -> List[Notification]:
        """Get unread notifications for an employee"""
        return db.query(Notification).filter(
            and_(
                Notification.user_id == employee_id,
                Notification.is_read == False
            )
        ).order_by(Notification.created_at.desc()).all()
    
    @staticmethod
    def mark_notification_read(db: Session, notification_id: int) -> Notification:
        """Mark a notification as read"""
        notification = db.query(Notification).filter(
            Notification.id == notification_id
        ).first()
        
        if notification:
            notification.is_read = True
            db.commit()
            db.refresh(notification)
        
        return notification
    
    @staticmethod
    def mark_all_notifications_read(db: Session, employee_id: UUID) -> int:
        """Mark all notifications as read for an employee"""
        count = db.query(Notification).filter(
            and_(
                Notification.user_id == employee_id,
                Notification.is_read == False
            )
        ).update({"is_read": True})
        
        db.commit()
        return count
    
    @staticmethod
    def delete_all_notifications(db: Session, employee_id: UUID) -> int:
        """Delete all notifications for an employee"""
        deleted_notification_count = db.query(Notification).filter(
            Notification.user_id == employee_id
        ).delete(synchronize_session=False)
        deleted_event_count = db.query(NotificationEvent).filter(
            NotificationEvent.user_id == employee_id
        ).delete(synchronize_session=False)
        db.commit()
        return deleted_notification_count + deleted_event_count

    @staticmethod
    def get_unread_count(db: Session, employee_id: UUID) -> int:
        """Get count of unread notifications for an employee"""
        return db.query(Notification).filter(
            and_(
                Notification.user_id == employee_id,
                Notification.is_read == False
            )
        ).count()

    @staticmethod
    def notify_target_assignment(db: Session) -> None:
        """9:30 AM - Notify employees of today's targets"""
        from .target_configuration_service import TargetConfigurationService
        from .target_engine_service import TargetEngineService
        employees = db.query(User).filter(User.role == "Employee").all()
        for emp in employees:
            if TargetConfigurationService.has_targets(emp.full_name):
                panel = TargetEngineService.get_today_target_panel(db, emp.id, emp.full_name)
                msg = (
                    f"Today's targets: {panel.total_required_calls} calls "
                    f"({panel.carry_forward_calls} carry forward), "
                    f"{panel.total_required_leads} leads "
                    f"({panel.carry_forward_leads} carry forward)."
                )
                PerformanceNotificationService.create_notification(
                    db, emp.id, "Today's Targets Assigned", msg, "target_assignment"
                )

    @staticmethod
    def send_afternoon_reminders(db: Session) -> None:
        """3 PM - Afternoon progress reminder"""
        from .target_configuration_service import TargetConfigurationService
        from .target_engine_service import TargetEngineService
        employees = db.query(User).filter(User.role == "Employee").all()
        for emp in employees:
            if TargetConfigurationService.has_targets(emp.full_name):
                panel = TargetEngineService.get_today_target_panel(db, emp.id, emp.full_name)
                msg = (
                    f"Afternoon check: {panel.calls_completed}/{panel.total_required_calls} calls, "
                    f"{panel.leads_completed}/{panel.total_required_leads} leads. "
                    f"Overall: {panel.overall_progress_pct}%."
                )
                PerformanceNotificationService.create_notification(
                    db, emp.id, "Afternoon Progress", msg, "target_reminder"
                )

    @staticmethod
    def send_target_warnings(db: Session) -> None:
        """5 PM - Target warning for behind-schedule employees"""
        from .target_configuration_service import TargetConfigurationService
        from .target_engine_service import TargetEngineService
        employees = db.query(User).filter(User.role == "Employee").all()
        for emp in employees:
            if TargetConfigurationService.has_targets(emp.full_name):
                panel = TargetEngineService.get_today_target_panel(db, emp.id, emp.full_name)
                if panel.overall_progress_pct < 70:
                    msg = (
                        f"Warning: Only {panel.overall_progress_pct}% complete. "
                        f"Remaining: {panel.calls_remaining} calls, {panel.leads_remaining} leads."
                    )
                    PerformanceNotificationService.create_notification(
                        db, emp.id, "Target Warning", msg, "target_warning"
                    )

    @staticmethod
    def send_logout_reminders(db: Session) -> None:
        """5:30 PM - Pending target reminder before logout"""
        from .target_configuration_service import TargetConfigurationService
        from .target_engine_service import TargetEngineService
        employees = db.query(User).filter(User.role == "Employee").all()
        for emp in employees:
            if TargetConfigurationService.has_targets(emp.full_name):
                panel = TargetEngineService.get_today_target_panel(db, emp.id, emp.full_name)
                if panel.calls_remaining > 0 or panel.leads_remaining > 0:
                    msg = (
                        f"30 minutes to logout. Pending: {panel.calls_remaining} calls, "
                        f"{panel.leads_remaining} leads."
                    )
                    PerformanceNotificationService.create_notification(
                        db, emp.id, "Pending Target Reminder", msg, "target_logout_reminder"
                    )

    @staticmethod
    def send_end_of_day_summaries(db: Session) -> None:
        """End of day completion summary"""
        from .target_configuration_service import TargetConfigurationService
        from .target_engine_service import TargetEngineService
        employees = db.query(User).filter(User.role == "Employee").all()
        for emp in employees:
            if TargetConfigurationService.has_targets(emp.full_name):
                panel = TargetEngineService.get_today_target_panel(db, emp.id, emp.full_name)
                status = "completed" if panel.calls_remaining == 0 and panel.leads_remaining == 0 else "incomplete"
                msg = (
                    f"Day {status}: {panel.calls_completed} calls, {panel.leads_completed} leads. "
                    f"Score: {panel.performance_score}/100. Zone: {panel.zone}."
                )
                if status == "incomplete":
                    msg += f" {panel.calls_remaining} calls and {panel.leads_remaining} leads carry forward tomorrow."
                PerformanceNotificationService.create_notification(
                    db, emp.id, "End of Day Summary", msg, "target_eod_summary"
                )
