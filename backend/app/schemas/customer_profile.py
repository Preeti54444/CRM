from __future__ import annotations
from datetime import datetime, date
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


class LeadDetails(BaseModel):
    id: int
    lead_name: str
    company_name: Optional[str] = None
    mobile: Optional[str] = None
    alternate_mobile: Optional[str] = None
    email: Optional[str] = None
    company_email: Optional[str] = None
    designation: Optional[str] = None
    location: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    product_type: Optional[str] = None
    funding_amount: Optional[float] = None
    lead_source: Optional[str] = None
    credit_rating: Optional[str] = None
    rating_date: Optional[str] = None
    rating_agency: Optional[str] = None
    lender_related_detail: Optional[str] = None
    lead_status: str
    sales_executive: Optional[str] = None
    date_of_entry: Optional[date] = None
    gst_number: Optional[str] = None
    pan_number: Optional[str] = None
    entity_type: Optional[str] = None
    annual_turnover: Optional[str] = None
    business_vintage: Optional[str] = None
    number_of_employees: Optional[int] = None
    year_of_incorporation: Optional[int] = None
    registered_office_address: Optional[str] = None
    business_description: Optional[str] = None
    industry: Optional[str] = None
    promoter_cibil_score: Optional[str] = None
    npa_history: Optional[str] = None
    guarantee_available: Optional[str] = None
    current_ratio: Optional[str] = None
    interest_coverage_ratio: Optional[str] = None
    dscr: Optional[str] = None
    date_of_first_call: Optional[date] = None
    purpose_of_call: Optional[str] = None
    product_service_discussed: Optional[str] = None
    call_outcome: Optional[str] = None
    current_status: Optional[str] = None
    final_outcome: Optional[str] = None
    lead_stage: Optional[str] = None
    last_activity_date: Optional[date] = None
    pipeline_stage: Optional[str] = None
    proposal_shared: Optional[str] = None
    next_followup_date: Optional[date] = None
    followup_time: Optional[str] = None
    followup_type: Optional[str] = None
    followup_note: Optional[str] = None
    deal_value: Optional[float] = None
    remarks: Optional[str] = None
    learning_challenge: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class CustomerProfileResponse(CustomerProfileBase):
    id: UUID
    created_at: datetime
    updated_at: datetime
    lead_details: Optional[LeadDetails] = None

    class Config:
        from_attributes = True
