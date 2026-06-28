from __future__ import annotations
from datetime import datetime, date
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, constr, Field


class CallBase(BaseModel):
    call_id: constr(strip_whitespace=True, min_length=1, max_length=100)
    call_type: constr(strip_whitespace=True, min_length=1, max_length=50)
    call_date: date
    call_time: Optional[str] = None
    duration_seconds: Optional[int] = None
    caller_name: Optional[constr(strip_whitespace=True, max_length=255)] = None
    caller_phone: constr(strip_whitespace=True, min_length=1, max_length=50)
    receiver_name: Optional[constr(strip_whitespace=True, max_length=255)] = None
    receiver_phone: Optional[constr(strip_whitespace=True, max_length=50)] = None
    receiver_email: Optional[constr(strip_whitespace=True, max_length=255)] = None
    lead_id: Optional[int] = None
    purpose: Optional[constr(strip_whitespace=True, max_length=100)] = None
    description: Optional[str] = None
    status: constr(strip_whitespace=True, min_length=1, max_length=50) = Field(default="Completed")
    priority: constr(strip_whitespace=True, min_length=1, max_length=50) = Field(default="Normal")
    outcome: Optional[str] = None
    followup_required: Optional[constr(strip_whitespace=True, max_length=50)] = None
    followup_date: Optional[date] = None
    followup_notes: Optional[str] = None
    recording_link: Optional[constr(strip_whitespace=True, max_length=500)] = None
    notes: Optional[str] = None


class CallCreate(CallBase):
    pass


class CallUpdate(BaseModel):
    call_type: Optional[constr(strip_whitespace=True, min_length=1, max_length=50)] = None
    call_date: Optional[date] = None
    call_time: Optional[str] = None
    duration_seconds: Optional[int] = None
    caller_name: Optional[constr(strip_whitespace=True, max_length=255)] = None
    caller_phone: Optional[constr(strip_whitespace=True, min_length=1, max_length=50)] = None
    receiver_name: Optional[constr(strip_whitespace=True, max_length=255)] = None
    receiver_phone: Optional[constr(strip_whitespace=True, max_length=50)] = None
    receiver_email: Optional[constr(strip_whitespace=True, max_length=255)] = None
    lead_id: Optional[int] = None
    purpose: Optional[constr(strip_whitespace=True, max_length=100)] = None
    description: Optional[str] = None
    status: Optional[constr(strip_whitespace=True, min_length=1, max_length=50)] = None
    priority: Optional[constr(strip_whitespace=True, min_length=1, max_length=50)] = None
    outcome: Optional[str] = None
    followup_required: Optional[constr(strip_whitespace=True, max_length=50)] = None
    followup_date: Optional[date] = None
    followup_notes: Optional[str] = None
    recording_link: Optional[constr(strip_whitespace=True, max_length=500)] = None
    notes: Optional[str] = None


class CallResponse(CallBase):
    id: int
    created_by: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
