from typing import List, Optional
from uuid import UUID
from datetime import datetime, date, timedelta

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from ..dependencies import get_db
from ..auth.dependencies import get_current_user, require_manager_or_admin
from ..schemas import FollowUpCreate, FollowUpResponse, FollowUpUpdate, FollowUpReminderResponse, FollowUpStatistics, SnoozeRequest
from ..services.followup_service import create_followup, get_followup_by_id, update_followup, complete_followup, snooze_followup, get_due_reminders, get_followup_statistics
from ..models.followup import FollowUp
from ..models.user import User

router = APIRouter(prefix="/followups", tags=["followups"])


@router.post("", response_model=FollowUpResponse, status_code=status.HTTP_201_CREATED)
def create_followup_endpoint(payload: FollowUpCreate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    obj = create_followup(db, payload, creator_id=current_user.id)
    return obj


@router.get("", response_model=list[FollowUpResponse])
def list_followups(
    lead_id: Optional[int] = None,
    assigned_to: Optional[UUID] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    query = db.query(FollowUp)
    
    # Role-based access: employees can only see their own follow-ups
    if current_user.role.lower() not in ['admin', 'manager']:
        query = query.filter(FollowUp.assigned_to == current_user.id)
    elif assigned_to is not None:
        query = query.filter(FollowUp.assigned_to == assigned_to)
    
    if lead_id is not None:
        query = query.filter(FollowUp.lead_id == lead_id)
    if status is not None:
        query = query.filter(FollowUp.status == status)
    
    items = query.order_by(FollowUp.followup_date.asc()).limit(100).all()
    return items


@router.get("/today", response_model=list[FollowUpReminderResponse])
def get_today_followups(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    today = date.today()
    query = db.query(FollowUp)
    
    # Role-based access
    if current_user.role.lower() not in ['admin', 'manager']:
        query = query.filter(FollowUp.assigned_to == current_user.id)
    
    items = query.filter(
        FollowUp.followup_date == today,
        FollowUp.followup_completed == False
    ).order_by(FollowUp.followup_time.asc()).all()
    
    # Enrich with lead information
    results = []
    for item in items:
        lead = item.lead
        assignee = item.assignee
        is_overdue = item.followup_time and datetime.now().time() > item.followup_time and not item.followup_completed
        
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


@router.get("/overdue", response_model=list[FollowUpReminderResponse])
def get_overdue_followups(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    now = datetime.now()
    query = db.query(FollowUp)
    
    # Role-based access
    if current_user.role.lower() not in ['admin', 'manager']:
        query = query.filter(FollowUp.assigned_to == current_user.id)
    
    items = query.filter(
        FollowUp.followup_date < now.date(),
        FollowUp.followup_completed == False
    ).order_by(FollowUp.followup_date.asc()).all()
    
    # Enrich with lead information
    results = []
    for item in items:
        lead = item.lead
        assignee = item.assignee
        
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
            is_overdue=True
        )
        results.append(result)
    
    return results


@router.get("/upcoming", response_model=list[FollowUpReminderResponse])
def get_upcoming_followups(
    days: int = Query(7, description="Number of days to look ahead"),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    today = date.today()
    future_date = today + timedelta(days=days)
    query = db.query(FollowUp)
    
    # Role-based access
    if current_user.role.lower() not in ['admin', 'manager']:
        query = query.filter(FollowUp.assigned_to == current_user.id)
    
    items = query.filter(
        FollowUp.followup_date > today,
        FollowUp.followup_date <= future_date,
        FollowUp.followup_completed == False
    ).order_by(FollowUp.followup_date.asc()).all()
    
    # Enrich with lead information
    results = []
    for item in items:
        lead = item.lead
        assignee = item.assignee
        
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
            is_overdue=False
        )
        results.append(result)
    
    return results


@router.get("/due-reminders", response_model=list[FollowUpReminderResponse])
def get_due_reminders_endpoint(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Get reminders that are due now (for popup notifications)"""
    reminders = get_due_reminders(db, current_user.id)
    return reminders


@router.get("/statistics", response_model=FollowUpStatistics)
def get_statistics(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Get follow-up statistics for dashboard widgets"""
    return get_followup_statistics(db, current_user)


@router.put("/{followup_id}", response_model=FollowUpResponse)
def update_followup_endpoint(followup_id: UUID, payload: FollowUpUpdate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    obj = get_followup_by_id(db, followup_id)
    if not obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Follow-up not found")
    
    # Role-based access: employees can only update their own follow-ups
    if current_user.role.lower() not in ['admin', 'manager'] and obj.assigned_to != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only update your own follow-ups")
    
    obj = update_followup(db, obj, payload)
    return obj


@router.post("/{followup_id}/complete", response_model=FollowUpResponse)
def complete_followup_endpoint(followup_id: UUID, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    obj = get_followup_by_id(db, followup_id)
    if not obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Follow-up not found")
    
    # Role-based access: employees can only complete their own follow-ups
    if current_user.role.lower() not in ['admin', 'manager'] and obj.assigned_to != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only complete your own follow-ups")
    
    obj = complete_followup(db, obj, completer_id=current_user.id)
    return obj


@router.post("/{followup_id}/snooze", response_model=FollowUpResponse)
def snooze_followup_endpoint(
    followup_id: UUID, 
    payload: SnoozeRequest, 
    db: Session = Depends(get_db), 
    current_user=Depends(get_current_user)
):
    obj = get_followup_by_id(db, followup_id)
    if not obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Follow-up not found")
    
    # Role-based access: employees can only snooze their own follow-ups
    if current_user.role.lower() not in ['admin', 'manager'] and obj.assigned_to != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only snooze your own follow-ups")
    
    obj = snooze_followup(db, obj, payload.snooze_minutes)
    return obj


@router.delete("/{followup_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_followup_endpoint(
    followup_id: UUID, 
    db: Session = Depends(get_db), 
    current_user=Depends(get_current_user)
):
    obj = get_followup_by_id(db, followup_id)
    if not obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Follow-up not found")
    
    # Role-based access: employees can only delete their own follow-ups
    if current_user.role.lower() not in ['admin', 'manager'] and obj.assigned_to != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only delete your own follow-ups")
    
    db.delete(obj)
    db.commit()
    return None
