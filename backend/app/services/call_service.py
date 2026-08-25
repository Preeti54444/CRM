from datetime import datetime
from typing import Optional, Tuple
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from ..models.call import Call
from ..models.user import User
from ..schemas.call import CallCreate, CallUpdate
from ..schemas.followup import FollowUpCreate
from ..services.followup_service import create_followup
from .performance_calculation_service import PerformanceCalculationService
from datetime import datetime as _dt, time as _time


def create_call(db: Session, call_in: CallCreate, creator_id: UUID) -> Call:
    new_call = Call(
        call_id=call_in.call_id,
        call_type=call_in.call_type,
        call_date=call_in.call_date,
        call_time=call_in.call_time,
        duration_seconds=call_in.duration_seconds,
        caller_name=call_in.caller_name,
        caller_phone=call_in.caller_phone,
        receiver_name=call_in.receiver_name,
        receiver_phone=call_in.receiver_phone,
        receiver_email=call_in.receiver_email,
        lead_id=call_in.lead_id,
        purpose=call_in.purpose,
        description=call_in.description,
        status=call_in.status,
        priority=call_in.priority,
        outcome=call_in.outcome,
        followup_required=call_in.followup_required,
        followup_date=call_in.followup_date,
        followup_notes=call_in.followup_notes,
        recording_link=call_in.recording_link,
        notes=call_in.notes,
        sale_executive=getattr(call_in, 'sale_executive', None),
        product=getattr(call_in, 'product', None),
        source=getattr(call_in, 'source', None),
        customer_company_name=getattr(call_in, 'customer_company_name', None),
        contact_person_name=getattr(call_in, 'contact_person_name', None),
        designation=getattr(call_in, 'designation', None),
        action=getattr(call_in, 'action', None),
        created_by=creator_id,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.add(new_call)
    db.commit()
    db.refresh(new_call)
    
    # Trigger performance recalculation for the employee
    try:
        employee = db.query(User).filter(User.id == creator_id).first()
        if employee and str(employee.role).lower() == "employee":
            PerformanceCalculationService.calculate_daily_performance(
                db, creator_id, employee.full_name
            )
            from .target_engine_service import TargetEngineService
            TargetEngineService.on_call_added(db, creator_id, employee.full_name, str(new_call.call_id))
    except Exception:
        pass
    # If the call requested a follow-up, create a FollowUp record (non-blocking)
    try:
        followup_flag = getattr(call_in, 'followup_required', None)
        followup_date = getattr(call_in, 'followup_date', None)
        followup_notes = getattr(call_in, 'followup_notes', None)

        if followup_flag and str(followup_flag).lower() in ['yes', 'true', '1'] and followup_date and new_call.lead_id:
            # Convert date to datetime at midnight for FollowUpCreate
            if isinstance(followup_date, _dt):
                fu_dt = followup_date
            else:
                fu_dt = _dt.combine(followup_date, _time.min)

            fu_payload = FollowUpCreate(
                lead_id=new_call.lead_id,
                assigned_to=creator_id,
                followup_date=fu_dt,
                followup_time=None,
                notes=followup_notes or '',
                status='scheduled',
                reminder_sent=False,
                followup_completed=False,
            )
            try:
                create_followup(db, fu_payload, creator_id=creator_id)
            except Exception:
                # Don't let follow-up creation break call save
                pass
    except Exception:
        pass

    return new_call


def get_call_by_id(db: Session, call_id: int | str) -> Optional[Call]:
    try:
        if isinstance(call_id, str):
            try:
                call_id = int(call_id)
            except ValueError:
                return None
        return db.query(Call).filter(Call.id == call_id).first()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching call by ID: {str(e)}"
        )


def get_calls(db: Session, skip: int = 0, limit: int = 50, search: Optional[str] = None, filters: dict | None = None) -> Tuple[list[Call], int]:
    try:
        q = db.query(Call)
        if search:
            like = f"%{search}%"
            q = q.filter(
                Call.caller_name.ilike(like) |
                Call.caller_phone.ilike(like) |
                Call.receiver_name.ilike(like) |
                Call.receiver_phone.ilike(like)
            )
        if filters:
            if "call_type" in filters:
                q = q.filter(Call.call_type == filters["call_type"])
            if "status" in filters:
                q = q.filter(Call.status == filters["status"])
            if "created_by" in filters:
                q = q.filter(Call.created_by == filters["created_by"])
            if "lead_id" in filters:
                q = q.filter(Call.lead_id == filters["lead_id"])
        total = q.count()
        items = q.order_by(Call.created_at.desc()).offset(skip).limit(limit).all()
        return items, total
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching calls: {str(e)}"
        )


def update_call(db: Session, call: Call, call_in: CallUpdate) -> Call:
    for field, value in call_in.__dict__.items():
        if value is not None:
            setattr(call, field, value)
    call.updated_at = datetime.utcnow()
    db.add(call)
    db.commit()
    db.refresh(call)
    return call


def delete_call(db: Session, call: Call) -> None:
    db.delete(call)
    db.commit()
