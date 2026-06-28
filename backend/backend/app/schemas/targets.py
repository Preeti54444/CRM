from __future__ import annotations
from datetime import date, datetime, time
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, constr, Field


class TargetBase(BaseModel):
    user_id: UUID
    role: constr(strip_whitespace=True, min_length=1, max_length=50)
    daily_call_target: int = Field(default=0, ge=0)
    daily_lead_target: int = Field(default=0, ge=0)
    weekly_lead_target: int = Field(default=0, ge=0)
    crm_log_deadline: Optional[time] = None
    effective_from: date


class TargetCreate(TargetBase):
    pass


class TargetUpdate(BaseModel):
    daily_call_target: Optional[int] = Field(default=None, ge=0)
    daily_lead_target: Optional[int] = Field(default=None, ge=0)
    weekly_lead_target: Optional[int] = Field(default=None, ge=0)
    crm_log_deadline: Optional[time] = None


class TargetResponse(TargetBase):
    id: int
    updated_by: UUID
    updated_at: datetime

    class Config:
        from_attributes = True
