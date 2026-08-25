from __future__ import annotations
from datetime import date, datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, constr, field_validator


class TaskCreate(BaseModel):
    title: constr(strip_whitespace=True, min_length=1, max_length=255)
    description: Optional[str] = None
    assigned_to: UUID
    assigned_by: Optional[UUID] = None
    priority: Optional[constr(strip_whitespace=True, max_length=50)] = "Normal"
    status: Optional[constr(strip_whitespace=True, max_length=50)] = "pending"
    due_date: Optional[date] = None


class TaskUpdate(BaseModel):
    title: Optional[constr(strip_whitespace=True, min_length=1, max_length=255)] = None
    description: Optional[str] = None
    assigned_to: Optional[UUID] = None
    priority: Optional[constr(strip_whitespace=True, max_length=50)] = None
    status: Optional[constr(strip_whitespace=True, max_length=50)] = None
    due_date: Optional[date] = None


class TaskStatusUpdate(BaseModel):
    status: constr(strip_whitespace=True, min_length=1, max_length=50)


class TaskSummary(BaseModel):
    total_tasks: int
    assigned_today: int
    pending_tasks: int
    completed_tasks: int
    overdue_tasks: int


class TaskResponse(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    assigned_to: UUID
    assigned_by: Optional[UUID] = None
    priority: str
    status: str
    due_date: Optional[date] = None
    created_at: datetime

    @field_validator("due_date", mode="before")
    @classmethod
    def normalize_due_date(cls, value):
        if value is None:
            return None
        if isinstance(value, datetime):
            return value.date()
        return value

    model_config = {"from_attributes": True}
