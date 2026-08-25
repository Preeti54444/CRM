"""Carry Forward Service - Automatic carry-forward of missed daily targets"""
import logging
from datetime import date, timedelta
from typing import Optional
from uuid import UUID
from sqlalchemy.orm import Session
from sqlalchemy import and_, func

from ..models.target_management import EmployeeCarryForward
from ..models.user import User
from .target_configuration_service import TargetConfigurationService
from .target_audit_service import TargetAuditService

logger = logging.getLogger(__name__)

class CarryForwardService:
    """Manage daily carry-forward logic"""

    OFFICE_END_HOUR = 18  # 6 PM

    @staticmethod
    def get_week_start(d: date) -> date:
        """Get Monday of the week containing date d"""
        return d - timedelta(days=d.weekday())

    @staticmethod
    def get_previous_working_day(d: date) -> date:
        """Get previous working day (skip Sunday)"""
        prev = d - timedelta(days=1)
        if prev.weekday() == 6:  # Sunday
            prev = prev - timedelta(days=1)
        return prev

    @staticmethod
    def get_carry_forward_for_date(
        db: Session, employee_id: UUID, target_date: date
    ) -> EmployeeCarryForward:
        """Get or create carry-forward record for a date"""
        try:
            record = db.query(EmployeeCarryForward).filter(
                and_(
                    EmployeeCarryForward.employee_id == employee_id,
                    EmployeeCarryForward.date == target_date,
                )
            ).first()
            if record:
                return record
        except Exception as e:
            logger.error(f"Error querying carry forward record: {e}")
            db.rollback()
            # Continue to create a new record

        try:
            employee = db.query(User).filter(User.id == employee_id).first()
            employee_name = employee.full_name if employee else ""
            daily = TargetConfigurationService.get_daily_targets(employee_name)
        except Exception as e:
            logger.error(f"Error getting employee or targets: {e}")
            db.rollback()
            employee_name = ""
            daily = {"daily_calls": 0, "daily_leads": 0}

        prev_date = CarryForwardService.get_previous_working_day(target_date)
        prev_week_start = CarryForwardService.get_week_start(prev_date)
        current_week_start = CarryForwardService.get_week_start(target_date)

        carry_calls = 0
        carry_leads = 0

        # Carry forward only within same week
        try:
            if prev_week_start == current_week_start:
                prev_record = db.query(EmployeeCarryForward).filter(
                    and_(
                        EmployeeCarryForward.employee_id == employee_id,
                        EmployeeCarryForward.date == prev_date,
                    )
                ).first()
                if prev_record and prev_record.remaining_calls > 0:
                    carry_calls = prev_record.remaining_calls
                if prev_record and prev_record.remaining_leads > 0:
                    carry_leads = prev_record.remaining_leads
        except Exception as e:
            logger.error(f"Error getting previous carry forward: {e}")
            db.rollback()
            # Continue without carry forward

        daily_calls = daily.get("daily_calls", 0)
        daily_leads = daily.get("daily_leads", 0)

        try:
            record = EmployeeCarryForward(
                employee_id=employee_id,
                date=target_date,
                week_start=current_week_start,
                carry_forward_calls=carry_calls,
                carry_forward_leads=carry_leads,
                daily_calls_target=daily_calls,
                daily_leads_target=daily_leads,
                total_required_calls=daily_calls + carry_calls,
                total_required_leads=daily_leads + carry_leads,
            )
            db.add(record)
            db.commit()
            db.refresh(record)
        except Exception as e:
            logger.error(f"Error creating carry forward record: {e}")
            db.rollback()
            # Return a minimal in-memory record
            record = EmployeeCarryForward(
                employee_id=employee_id,
                date=target_date,
                week_start=current_week_start,
                carry_forward_calls=0,
                carry_forward_leads=0,
                daily_calls_target=daily_calls,
                daily_leads_target=daily_leads,
                total_required_calls=daily_calls,
                total_required_leads=daily_leads,
            )

        try:
            if carry_calls > 0 or carry_leads > 0:
                TargetAuditService.log(
                    db,
                    action="carry_forward_created",
                    employee_id=employee_id,
                    details=f"Carry forward: {carry_calls} calls, {carry_leads} leads",
                    metadata={"date": str(target_date), "calls": carry_calls, "leads": carry_leads},
                )
        except Exception as e:
            logger.error(f"Error logging carry forward: {e}")
            db.rollback()
            # Continue without logging

        return record

    @staticmethod
    def update_daily_progress(
        db: Session,
        employee_id: UUID,
        calls_completed: int,
        leads_completed: int,
        target_date: Optional[date] = None,
    ) -> EmployeeCarryForward:
        """Update carry-forward record with current progress"""
        if target_date is None:
            target_date = date.today()

        try:
            record = CarryForwardService.get_carry_forward_for_date(db, employee_id, target_date)
            # Check if record is persistent in the session
            from sqlalchemy import inspect
            if inspect(record).persistent:
                record.calls_completed = calls_completed
                record.leads_completed = leads_completed
                record.remaining_calls = max(0, record.total_required_calls - calls_completed)
                record.remaining_leads = max(0, record.total_required_leads - leads_completed)
                db.commit()
                db.refresh(record)
            else:
                # Record is not persistent, try to query it fresh
                fresh_record = db.query(EmployeeCarryForward).filter(
                    and_(
                        EmployeeCarryForward.employee_id == employee_id,
                        EmployeeCarryForward.date == target_date,
                    )
                ).first()
                if fresh_record:
                    fresh_record.calls_completed = calls_completed
                    fresh_record.leads_completed = leads_completed
                    fresh_record.remaining_calls = max(0, fresh_record.total_required_calls - calls_completed)
                    fresh_record.remaining_leads = max(0, fresh_record.total_required_leads - leads_completed)
                    db.commit()
                    db.refresh(fresh_record)
                    return fresh_record
                else:
                    # Create the record if it doesn't exist
                    employee = db.query(User).filter(User.id == employee_id).first()
                    employee_name = employee.full_name if employee else ""
                    daily = TargetConfigurationService.get_daily_targets(employee_name)
                    daily_calls = daily.get("daily_calls", 0)
                    daily_leads = daily.get("daily_leads", 0)
                    
                    fresh_record = EmployeeCarryForward(
                        employee_id=employee_id,
                        date=target_date,
                        week_start=CarryForwardService.get_week_start(target_date),
                        carry_forward_calls=0,
                        carry_forward_leads=0,
                        daily_calls_target=daily_calls,
                        daily_leads_target=daily_leads,
                        total_required_calls=daily_calls,
                        total_required_leads=daily_leads,
                        calls_completed=calls_completed,
                        leads_completed=leads_completed,
                        remaining_calls=max(0, daily_calls - calls_completed),
                        remaining_leads=max(0, daily_leads - leads_completed),
                    )
                    db.add(fresh_record)
                    db.commit()
                    db.refresh(fresh_record)
                    return fresh_record
            return record
        except Exception as e:
            logger.error(f"Error updating daily progress: {e}")
            db.rollback()
            # Return a basic in-memory record as fallback
            try:
                employee = db.query(User).filter(User.id == employee_id).first()
                employee_name = employee.full_name if employee else ""
                daily = TargetConfigurationService.get_daily_targets(employee_name)
            except Exception:
                employee_name = ""
                daily = {"daily_calls": 0, "daily_leads": 0}
            
            daily_calls = daily.get("daily_calls", 0)
            daily_leads = daily.get("daily_leads", 0)
            
            fallback_record = EmployeeCarryForward(
                employee_id=employee_id,
                date=target_date,
                week_start=CarryForwardService.get_week_start(target_date),
                carry_forward_calls=0,
                carry_forward_leads=0,
                daily_calls_target=daily_calls,
                daily_leads_target=daily_leads,
                total_required_calls=daily_calls,
                total_required_leads=daily_leads,
                calls_completed=calls_completed,
                leads_completed=leads_completed,
                remaining_calls=max(0, daily_calls - calls_completed),
                remaining_leads=max(0, daily_leads - leads_completed),
            )
            return fallback_record

    @staticmethod
    def close_day(
        db: Session, employee_id: UUID, employee_name: str, close_date: Optional[date] = None
    ) -> EmployeeCarryForward:
        """Close a day and prepare carry-forward for next day"""
        if close_date is None:
            close_date = date.today()

        from .target_engine_service import TargetEngineService
        metrics = TargetEngineService.get_raw_metrics(db, employee_id, close_date)

        record = CarryForwardService.update_daily_progress(
            db, employee_id, metrics["outbound_calls"], metrics["qualified_leads"], close_date
        )
        record.is_closed = True
        db.commit()
        db.refresh(record)

        if record.remaining_calls > 0 or record.remaining_leads > 0:
            TargetAuditService.log(
                db,
                action="target_missed",
                employee_id=employee_id,
                details=f"Missed: {record.remaining_calls} calls, {record.remaining_leads} leads",
                metadata={"date": str(close_date)},
            )
        else:
            TargetAuditService.log(
                db,
                action="target_completed",
                employee_id=employee_id,
                details="Daily target completed",
                metadata={"date": str(close_date)},
            )
        return record

    @staticmethod
    def reset_weekly_carry_forward(db: Session, week_start: date) -> int:
        """Reset carry-forward at end of week (Saturday evening)"""
        count = db.query(EmployeeCarryForward).filter(
            and_(
                EmployeeCarryForward.week_start == week_start,
                EmployeeCarryForward.is_closed == False,
            )
        ).update({"is_closed": True})
        db.commit()
        return count
