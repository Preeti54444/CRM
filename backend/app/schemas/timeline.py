from __future__ import annotations
from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, constr


class TimelineEventBase(BaseModel):
    lead_id: Optional[int] = None
    customer_id: Optional[UUID] = None
    event_type: constr(strip_whitespace=True, max_length=100)
    description: Optional[constr(strip_whitespace=True, max_length=2000)] = None
    event_metadata: Optional[constr(strip_whitespace=True, max_length=2000)] = None


class TimelineEventCreate(TimelineEventBase):
    pass


class TimelineEventResponse(TimelineEventBase):
    id: UUID
    created_by: Optional[UUID] = None
    created_at: datetime

    class Config:
        from_attributes = True
