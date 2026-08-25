from __future__ import annotations
from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel


class TimerMetricBase(BaseModel):
    work_seconds: Optional[int] = 0
    call_seconds: Optional[int] = 0
    break_seconds: Optional[int] = 0
    meeting_seconds: Optional[int] = 0
    call_count: Optional[int] = 0


class TimerMetricCreate(TimerMetricBase):
    pass


class TimerMetricUpdate(TimerMetricBase):
    pass


class TimerMetricResponse(BaseModel):
    id: int
    user_id: UUID
    work_seconds: int
    call_seconds: int
    break_seconds: int
    meeting_seconds: int
    call_count: int
    created_at: datetime
    updated_at: datetime

    model_config = {
        'from_attributes': True
    }
