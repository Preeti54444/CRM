from datetime import datetime, date, timedelta, time
from typing import Optional, List
from uuid import UUID, uuid4

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from ..models.followup import FollowUp
from ..models.user import User
from ..schemas.followup import FollowUpCreate, FollowUpUpdate, FollowUpReminderResponse
from ..schemas.timeline import TimelineEventCreate
from ..services.timeline_service import add_timeline_event
from ..services.notification_service import create_notification


def create_followup(db: Session, payload: FollowUpCreate, creator_id: Optional[UUID] = None) -> FollowUp:
    obj = FollowUp(
        id=uuid4(),
        lead_id=payload.lead_id,
        assigned_to=payload.assigned_to,
        followup_date=payload.followup_date,
        followup_time=payload.followup_time,
        followup_type=payload.followup_type,
        notes=payload.notes,
        next_followup_date=payload.next_followup_date,
        next_followup_time=payload.next_followup_time,
        status=payload.status or "scheduled",
        reminder_sent=payload.reminder_sent if payload.reminder_sent is not None else False,
        followup_completed=payload.followup_completed if payload.followup_completed is not None else False,
        created_by=creator_id,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.add(obj)
    db.commit()
    db.refresh(obj)
    add_timeline_event(
        db,
        TimelineEventCreate(
            lead_id=obj.lead_id,
            event_type="Follow-Up Added",
            description=f"Follow-up scheduled for {obj.followup_date.isoformat()}.",
        ),
        creator_id=creator_id,
    )
    if obj.assigned_to is not None:
        create_notification(
            db,
            obj.assigned_to,
            title="New Follow-Up Scheduled",
            message=f"A follow-up has been scheduled for lead {obj.lead_id} on {obj.followup_date.isoformat()}.",
        )
    return obj


def get_followup_by_id(db: Session, followup_id: UUID) -> Optional[FollowUp]:
    return db.query(FollowUp).filter(FollowUp.id == followup_id).first()


def update_followup(db: Session, obj: FollowUp, payload: FollowUpUpdate) -> FollowUp:
    for field, value in payload.__dict__.items():
        if value is not None:
            setattr(obj, field, value)
    obj.updated_at = datetime.utcnow()
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


def complete_followup(db: Session, obj: FollowUp, completer_id: Optional[UUID] = None) -> FollowUp:
    obj.status = "completed"
    obj.followup_completed = True
    obj.updated_at = datetime.utcnow()
    db.add(obj)
    db.commit()
    db.refresh(obj)
    add_timeline_event(
        db,
        TimelineEventCreate(
            lead_id=obj.lead_id,
            event_type="Follow-Up Completed",
            description=f"Follow-up completed on {datetime.utcnow().isoformat()}.",
        ),
        creator_id=completer_id,
    )
    if obj.assigned_to is not None:
        create_notification(
            db,
            obj.assigned_to,
            title="Follow-Up Completed",
            message=f"A follow-up for lead {obj.lead_id} has been marked completed.",
        )
    return obj


def snooze_followup(db: Session, obj: FollowUp, snooze_minutes: int) -> FollowUp:
    """Snooze a follow-up by adding minutes to the scheduled time"""
    if obj.followup_time:
        # Combine date and time, add minutes, then split back
        combined_datetime = datetime.combine(obj.followup_date, obj.followup_time)
        new_datetime = combined_datetime + timedelta(minutes=snooze_minutes)
        obj.followup_date = new_datetime.date()
        obj.followup_time = new_datetime.time()
    else:
        # If no time specified, just add minutes to date (treated as midnight)
        combined_datetime = datetime.combine(obj.followup_date, time.min)
        new_datetime = combined_datetime + timedelta(minutes=snooze_minutes)
        obj.followup_date = new_datetime.date()
        obj.followup_time = new_datetime.time()
    
    obj.reminder_sent = False  # Reset reminder flag so it triggers again
    obj.updated_at = datetime.utcnow()
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


def get_due_reminders(db: Session, user_id: UUID) -> List[FollowUpReminderResponse]:
    """Get reminders that are due now for a specific user"""
    now = datetime.now()
    today = now.date()
    current_time = now.time()
    
    query = db.query(FollowUp).filter(
        FollowUp.assigned_to == user_id,
        FollowUp.followup_completed == False,
        FollowUp.reminder_sent == False
    )
    
    # Get follow-ups that are due today and time has passed, or overdue
    items = query.filter(
        (FollowUp.followup_date < today) |
        ((FollowUp.followup_date == today) & (FollowUp.followup_time <= current_time))
    ).order_by(FollowUp.followup_date.asc(), FollowUp.followup_time.asc()).all()
    
    # Mark as reminder sent to avoid duplicates
    for item in items:
        item.reminder_sent = True
        db.add(item)
    db.commit()
    
    # Enrich with lead information
    results = []
    for item in items:
        lead = item.lead
        assignee = item.assignee
        is_overdue = item.followup_date < today or (item.followup_date == today and item.followup_time and current_time > item.followup_time)
        
        result = FollowUpReminderResponse(
            id=item.id,
            lead_id=item.lead_id,
            lead_name=lead.lead_name if lead else None,
            company_name=lead.company_name if lead else None,
            mobile=lead.mobile if lead else None,
            funding_amount=lead.funding_amount if lead else None,
            assigned_to=item.assigned_to,
            assigned_to_name=assignee.full_name if assignee else None,
            followup_date=item.followup_date,
            followup_time=item.followup_time,
            notes=item.notes,
            status=item.status,
            reminder_sent=item.reminder_sent,
            followup_completed=item.followup_completed,
            is_overdue=is_overdue
        )
        results.append(result)
    
    return results


def get_followup_statistics(db: Session, user: User) -> dict:
    """Get follow-up statistics for dashboard widgets"""
    today = date.today()
    now = datetime.now()
    
    # Base query with role-based filtering
    query = db.query(FollowUp)
    if user.role.lower() not in ['admin', 'manager']:
        query = query.filter(FollowUp.assigned_to == user.id)
    
    # Today's statistics
    today_followups = query.filter(FollowUp.followup_date == today).all()
    total_today = len(today_followups)
    completed_today = len([f for f in today_followups if f.followup_completed])
    pending_today = total_today - completed_today
    
    # Overdue statistics
    overdue_followups = query.filter(
        FollowUp.followup_date < today,
        FollowUp.followup_completed == False
    ).all()
    overdue_today = len(overdue_followups)
    
    # Calculate completion percentage
    completion_percentage = (completed_today / total_today * 100) if total_today > 0 else 0
    
    # Employee-wise statistics (for admins/managers)
    employee_stats = []
    if user.role.lower() in ['admin', 'manager']:
        employees = db.query(User).filter(User.role.in_(['Employee', 'Manager'])).all()
        for emp in employees:
            emp_followups = db.query(FollowUp).filter(
                FollowUp.assigned_to == emp.id,
                FollowUp.followup_date == today
            ).all()
            emp_total = len(emp_followups)
            emp_completed = len([f for f in emp_followups if f.followup_completed])
            emp_percentage = (emp_completed / emp_total * 100) if emp_total > 0 else 0
            
            employee_stats.append({
                "employee_id": str(emp.id),
                "employee_name": emp.full_name,
                "total": emp_total,
                "completed": emp_completed,
                "pending": emp_total - emp_completed,
                "completion_percentage": emp_percentage
            })
    
    return {
        "total_today": total_today,
        "completed_today": completed_today,
        "pending_today": pending_today,
        "overdue_today": overdue_today,
        "completion_percentage": completion_percentage,
        "employee_stats": employee_stats
    }


def update_overdue_status(db: Session):
    """Mark overdue follow-ups and update their status"""
    now = datetime.now()
    today = now.date()
    current_time = now.time()
    
    overdue_followups = db.query(FollowUp).filter(
        FollowUp.followup_date < today,
        FollowUp.followup_completed == False,
        FollowUp.status != "overdue"
    ).all()
    
    for followup in overdue_followups:
        followup.status = "overdue"
        db.add(followup)
    
    db.commit()
    return len(overdue_followups)
