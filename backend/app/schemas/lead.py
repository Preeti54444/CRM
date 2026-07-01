from __future__ import annotations
from datetime import datetime, date
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
    followup_date: Optional[date] = None
    deal_value: Optional[float] = None


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
    followup_date: Optional[date] = None
    deal_value: Optional[float] = None


class LeadResponse(LeadBase):
    id: int
    created_at: datetime
    updated_at: datetime
    
    # Computed fields for display (not in database)
    assigned_user_name: Optional[str] = None
    created_by_name: Optional[str] = None
    
    # Activity classification fields
    has_call_activity: bool = False
    has_followup: bool = False
    last_call_date: Optional[datetime] = None
    last_followup_date: Optional[datetime] = None
    
    # Lead classification: "New" or "Call Management"
    lead_classification: Optional[str] = None

    class Config:
        from_attributes = True
