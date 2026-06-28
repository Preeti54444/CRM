from __future__ import annotations
from datetime import datetime
from typing import Optional, List
from uuid import UUID

from pydantic import BaseModel, constr, Field


class LeadBase(BaseModel):
    lead_name: constr(strip_whitespace=True, min_length=1, max_length=255)
    company_name: Optional[constr(strip_whitespace=True, max_length=255)] = None
    mobile: Optional[constr(strip_whitespace=True, max_length=50)] = None
    alternate_mobile: Optional[constr(strip_whitespace=True, max_length=50)] = None
    email: Optional[constr(strip_whitespace=True, max_length=255)] = None
    company_email: Optional[constr(strip_whitespace=True, max_length=255)] = None
    city: Optional[constr(strip_whitespace=True, max_length=100)] = None
    state: Optional[constr(strip_whitespace=True, max_length=100)] = None
    product_type: Optional[constr(strip_whitespace=True, max_length=100)] = None
    funding_amount: Optional[float] = None
    lead_source: Optional[constr(strip_whitespace=True, max_length=100)] = None
    lead_status: Optional[constr(strip_whitespace=True, max_length=100)] = Field(default="New")
    assigned_to: Optional[UUID] = None
    remarks: Optional[constr(strip_whitespace=True, max_length=1000)] = None


class LeadCreate(LeadBase):
    pass


class LeadUpdate(BaseModel):
    lead_name: Optional[constr(strip_whitespace=True, min_length=1, max_length=255)] = None
    company_name: Optional[constr(strip_whitespace=True, max_length=255)] = None
    mobile: Optional[constr(strip_whitespace=True, max_length=50)] = None
    alternate_mobile: Optional[constr(strip_whitespace=True, max_length=50)] = None
    email: Optional[constr(strip_whitespace=True, max_length=255)] = None
    company_email: Optional[constr(strip_whitespace=True, max_length=255)] = None
    city: Optional[constr(strip_whitespace=True, max_length=100)] = None
    state: Optional[constr(strip_whitespace=True, max_length=100)] = None
    product_type: Optional[constr(strip_whitespace=True, max_length=100)] = None
    funding_amount: Optional[float] = None
    lead_source: Optional[constr(strip_whitespace=True, max_length=100)] = None
    lead_status: Optional[constr(strip_whitespace=True, max_length=100)] = None
    assigned_to: Optional[UUID] = None
    remarks: Optional[constr(strip_whitespace=True, max_length=1000)] = None


class LeadResponse(LeadBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
