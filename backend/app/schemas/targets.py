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


class AdminTargetAssignmentRequest(BaseModel):
    """Admin request to assign targets to an employee"""
    employee_id: UUID
    daily_call_target: int = Field(ge=0, description="Daily call target")
    daily_lead_target: int = Field(ge=0, description="Daily lead target")
    weekly_call_target: Optional[int] = Field(default=None, ge=0, description="Weekly call target")
    weekly_lead_target: Optional[int] = Field(default=None, ge=0, description="Weekly lead target")
    morning_call_target: Optional[int] = Field(default=None, ge=0, description="Morning call target")
    morning_lead_target: Optional[int] = Field(default=None, ge=0, description="Morning lead target")
    effective_from: date = Field(default_factory=date.today, description="Date when targets become effective")


class AdminTargetAssignmentResponse(BaseModel):
    """Response after admin assigns targets"""
    id: int
    employee_id: UUID
    employee_name: str
    daily_call_target: int
    daily_lead_target: int
    weekly_call_target: Optional[int]
    weekly_lead_target: Optional[int]
    morning_call_target: Optional[int]
    morning_lead_target: Optional[int]
    assigned_by: UUID
    assigned_at: datetime
    effective_from: date
    notification_sent: bool

    class Config:
        from_attributes = True


class EmployeeAssignedTargets(BaseModel):
    """Targets assigned to an employee"""
    daily_calls: int
    daily_leads: int
    weekly_calls: Optional[int]
    weekly_leads: Optional[int]
    morning_calls: Optional[int]
    morning_leads: Optional[int]
    assigned_at: Optional[datetime]
    assigned_by_name: Optional[str]
