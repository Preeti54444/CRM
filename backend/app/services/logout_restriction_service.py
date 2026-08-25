"""Logout Restriction Service and Admin Override Logic"""
from datetime import datetime, timedelta
from typing import Dict
from uuid import UUID
from sqlalchemy.orm import Session
from sqlalchemy import and_

from ..models.employee_performance import LogoutOverrideLog
from ..models.user import User
from ..schemas.employee_performance import LogoutCheckResponse, LogoutOverrideLogCreate
from .target_configuration_service import TargetConfigurationService
from .performance_calculation_service import PerformanceCalculationService
from .performance_notification_service import PerformanceNotificationService
from .target_engine_service import TargetEngineService


class LogoutRestrictionService:
    """Service for managing logout restrictions and admin overrides"""

    @staticmethod
    def check_logout_permission(
        db: Session,
        employee_id: UUID,
        employee_name: str
    ) -> LogoutCheckResponse:
        """Check if employee can logout based on daily target + carry-forward"""
        result = TargetEngineService.check_logout(db, employee_id, employee_name)
        return LogoutCheckResponse(
            can_logout=result.can_logout,
            required_calls=result.required_calls,
            required_leads=result.required_leads,
            completed_calls=result.completed_calls,
            completed_leads=result.completed_leads,
            message=result.message,
        )
    
    @staticmethod
    def create_logout_override(
        db: Session,
        employee_id: UUID,
        admin_id: UUID,
        reason: str
    ) -> LogoutOverrideLog:
        """Create a logout override log entry"""
        employee = db.query(User).filter(User.id == employee_id).first()
        admin = db.query(User).filter(User.id == admin_id).first()
        
        if not employee or not admin:
            raise ValueError("Employee or admin not found")
        
        # Get current performance metrics
        completed_calls = PerformanceCalculationService.get_today_calls(db, employee_id)
        completed_leads = PerformanceCalculationService.get_today_leads(db, employee_id)
        
        # Create override log
        override_log = LogoutOverrideLog(
            employee_id=employee_id,
            approved_by=admin_id,
            reason=reason,
            calls_completed=completed_calls,
            leads_completed=completed_leads
        )
        
        db.add(override_log)
        db.commit()
        db.refresh(override_log)
        
        # Notify employee
        PerformanceNotificationService.notify_admin_override_approved(
            db, employee_id, admin.full_name
        )
        
        return override_log
    
    @staticmethod
    def get_override_logs(db: Session, employee_id: UUID = None) -> list:
        """Get logout override logs, optionally filtered by employee"""
        query = db.query(LogoutOverrideLog)
        
        if employee_id:
            query = query.filter(LogoutOverrideLog.employee_id == employee_id)
        
        logs = query.order_by(LogoutOverrideLog.created_at.desc()).all()
        
        result = []
        for log in logs:
            employee = db.query(User).filter(User.id == log.employee_id).first()
            admin = db.query(User).filter(User.id == log.approved_by).first()
            
            result.append({
                "id": log.id,
                "employee_id": str(log.employee_id),
                "employee_name": employee.full_name if employee else "Unknown",
                "approved_by_id": str(log.approved_by),
                "approved_by_name": admin.full_name if admin else "Unknown",
                "reason": log.reason,
                "calls_completed": log.calls_completed,
                "leads_completed": log.leads_completed,
                "created_at": log.created_at
            })
        
        return result
    
    @staticmethod
    def has_recent_override(db: Session, employee_id: UUID, hours: int = 24) -> bool:
        """Check if employee has a recent override within specified hours"""
        cutoff_time = datetime.utcnow() - timedelta(hours=hours)
        
        count = db.query(LogoutOverrideLog).filter(
            and_(
                LogoutOverrideLog.employee_id == employee_id,
                LogoutOverrideLog.created_at >= cutoff_time
            )
        ).count()
        
        return count > 0
