from datetime import datetime
from typing import Optional, Tuple
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from ..models.call import Call
from ..schemas.call import CallCreate, CallUpdate


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
        created_by=creator_id,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.add(new_call)
    db.commit()
    db.refresh(new_call)
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
