from datetime import datetime
from typing import Optional, Literal

from pydantic import BaseModel, Field


class EarlyLogoutRequestCreate(BaseModel):
    work_seconds: int
    request_reason: Optional[str] = None

    model_config = {
        'extra': 'allow'
    }


class EarlyLogoutRequestReview(BaseModel):
    request_id: int
    decision: Literal['approved', 'rejected']
    comment: Optional[str] = None

    model_config = {
        'extra': 'allow'
    }


class EarlyLogoutRequestResponse(BaseModel):
    id: int
    status: str
    request_reason: Optional[str] = None
    review_comment: Optional[str] = None
    work_seconds: int
    requested_at: datetime
    reviewed_at: Optional[datetime] = None
    requester_id: str
    requester_name: Optional[str] = None
    reviewer_id: Optional[str] = None
    reviewer_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = {
        'from_attributes': True
    }
