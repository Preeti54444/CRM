from __future__ import annotations
from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, constr


class FollowUpBase(BaseModel):
    lead_id: int
    assigned_to: Optional[UUID] = None
    followup_date: datetime
    followup_type: Optional[constr(strip_whitespace=True, max_length=100)] = None
    notes: Optional[constr(strip_whitespace=True, max_length=2000)] = None
    next_followup_date: Optional[datetime] = None
    status: Optional[constr(strip_whitespace=True, max_length=50)] = "scheduled"


class FollowUpCreate(FollowUpBase):
    pass


class FollowUpUpdate(BaseModel):
    assigned_to: Optional[UUID] = None
    followup_date: Optional[datetime] = None
    followup_type: Optional[constr(strip_whitespace=True, max_length=100)] = None
    notes: Optional[constr(strip_whitespace=True, max_length=2000)] = None
    next_followup_date: Optional[datetime] = None
    status: Optional[constr(strip_whitespace=True, max_length=50)] = None


class FollowUpResponse(FollowUpBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
