from __future__ import annotations
from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, Field


class WorkSessionCreate(BaseModel):
    notes: Optional[str] = None
    session_metadata: Optional[dict[str, Any]] = Field(default_factory=dict)

    model_config = {
        'extra': 'allow'
    }


class WorkSessionStopRequest(BaseModel):
    session_id: Optional[int] = None
    notes: Optional[str] = None

    model_config = {
        'extra': 'allow'
    }


class WorkSessionResponse(BaseModel):
    id: int
    status: str
    notes: Optional[str] = None
    session_metadata: Optional[dict[str, Any]] = None
    started_at: datetime
    ended_at: Optional[datetime] = None
    duration_seconds: Optional[int] = None
    created_by: str
    created_by_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = {
        'from_attributes': True
    }
