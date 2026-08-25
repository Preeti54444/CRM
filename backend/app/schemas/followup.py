from __future__ import annotations
from datetime import datetime, time
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, constr


class FollowUpBase(BaseModel):
    lead_id: int
    assigned_to: Optional[UUID] = None
    followup_date: datetime
    followup_time: Optional[time] = None
    followup_type: Optional[constr(strip_whitespace=True, max_length=100)] = None
    notes: Optional[constr(strip_whitespace=True, max_length=2000)] = None
    next_followup_date: Optional[datetime] = None
    next_followup_time: Optional[time] = None
    status: Optional[constr(strip_whitespace=True, max_length=50)] = "scheduled"
    reminder_sent: Optional[bool] = False
    followup_completed: Optional[bool] = False


class FollowUpCreate(FollowUpBase):
    pass


class FollowUpUpdate(BaseModel):
    assigned_to: Optional[UUID] = None
    followup_date: Optional[datetime] = None
    followup_time: Optional[time] = None
    followup_type: Optional[constr(strip_whitespace=True, max_length=100)] = None
    notes: Optional[constr(strip_whitespace=True, max_length=2000)] = None
    next_followup_date: Optional[datetime] = None
    next_followup_time: Optional[time] = None
    status: Optional[constr(strip_whitespace=True, max_length=50)] = None
    reminder_sent: Optional[bool] = None
    followup_completed: Optional[bool] = None


class FollowUpResponse(FollowUpBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class FollowUpReminderResponse(BaseModel):
    id: UUID
    lead_id: int
    lead_name: Optional[str] = None
    company_name: Optional[str] = None
    mobile: Optional[str] = None
    funding_amount: Optional[float] = None
    assigned_to: Optional[UUID] = None
    assigned_to_name: Optional[str] = None
    followup_date: datetime
    followup_time: Optional[time] = None
    notes: Optional[str] = None
    status: str
    reminder_sent: bool
    followup_completed: bool
    is_overdue: bool = False

    class Config:
        from_attributes = True


class FollowUpStatistics(BaseModel):
    total_today: int
    completed_today: int
    pending_today: int
    overdue_today: int
    completion_percentage: float
    employee_stats: list[dict]

    class Config:
        from_attributes = True


class SnoozeRequest(BaseModel):
    snooze_minutes: int
