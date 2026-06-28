from __future__ import annotations
from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, constr


class CustomerProfileBase(BaseModel):
    lead_id: int
    company_type: Optional[constr(strip_whitespace=True, max_length=100)] = None
    gst_number: Optional[constr(strip_whitespace=True, max_length=50)] = None
    pan_number: Optional[constr(strip_whitespace=True, max_length=50)] = None
    turnover: Optional[float] = None
    business_vintage: Optional[int] = None
    funding_requirement: Optional[constr(strip_whitespace=True, max_length=255)] = None
    assigned_rm: Optional[UUID] = None


class CustomerProfileCreate(CustomerProfileBase):
    pass


class CustomerProfileUpdate(BaseModel):
    company_type: Optional[constr(strip_whitespace=True, max_length=100)] = None
    gst_number: Optional[constr(strip_whitespace=True, max_length=50)] = None
    pan_number: Optional[constr(strip_whitespace=True, max_length=50)] = None
    turnover: Optional[float] = None
    business_vintage: Optional[int] = None
    funding_requirement: Optional[constr(strip_whitespace=True, max_length=255)] = None
    assigned_rm: Optional[UUID] = None


class CustomerProfileResponse(CustomerProfileBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
