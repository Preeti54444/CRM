from __future__ import annotations
from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, Field


class ReportCreate(BaseModel):
    report_type: Optional[str] = None
    payload: dict[str, Any] = Field(default_factory=dict)
    created_by: Optional[str] = None
    created_by_name: Optional[str] = None

    model_config = {
        "extra": "allow"
    }


class ReportResponse(BaseModel):
    id: int
    report_type: str
    payload: dict[str, Any]
    created_by: Optional[str] = None
    created_by_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = {
        "from_attributes": True
    }
