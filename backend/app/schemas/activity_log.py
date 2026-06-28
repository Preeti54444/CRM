from __future__ import annotations
from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel


class ActivityLogResponse(BaseModel):
    id: UUID
    user_id: UUID
    action: str
    entity_type: str
    entity_id: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
