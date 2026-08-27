from __future__ import annotations
from datetime import datetime, date
from typing import Optional, List, Dict, Any
from uuid import UUID

from pydantic import BaseModel, constr, Field


class LeadBase(BaseModel):
    lead_name: constr(strip_whitespace=True, min_length=1, max_length=255)
    company_name: Optional[constr(strip_whitespace=True, max_length=255)] = None
    designation: Optional[constr(strip_whitespace=True, max_length=255)] = None
    mobile: Optional[constr(strip_whitespace=True, max_length=50)] = None
    alternate_mobile: Optional[constr(strip_whitespace=True, max_length=50)] = None
    email: Optional[constr(strip_whitespace=True, max_length=255)] = None
    company_email: Optional[constr(strip_whitespace=True, max_length=255)] = None
    city: Optional[constr(strip_whitespace=True, max_length=100)] = None
    state: Optional[constr(strip_whitespace=True, max_length=100)] = None
    location: Optional[constr(strip_whitespace=True, max_length=255)] = None
    product_type: Optional[constr(strip_whitespace=True, max_length=100)] = None
    vertical: Optional[constr(strip_whitespace=True, max_length=100)] = None
    sub_product: Optional[constr(strip_whitespace=True, max_length=100)] = None
    funding_amount: Optional[float] = None
    lead_source: Optional[constr(strip_whitespace=True, max_length=100)] = None
    credit_rating: Optional[constr(strip_whitespace=True, max_length=100)] = None
    rating_date: Optional[constr(strip_whitespace=True, max_length=50)] = None
    rating_agency: Optional[constr(strip_whitespace=True, max_length=255)] = None
    lender_related_detail: Optional[constr(strip_whitespace=True, max_length=1000)] = None
    lead_status: Optional[constr(strip_whitespace=True, max_length=100)] = Field(default="New")
    assigned_to: Optional[UUID] = None
    remarks: Optional[constr(strip_whitespace=True, max_length=1000)] = None
    followup_date: Optional[date] = None
    deal_value: Optional[float] = None
    ageing: Optional[int] = None
    action: Optional[constr(strip_whitespace=True, max_length=255)] = None
    pipeline_stage: Optional[constr(strip_whitespace=True, max_length=100)] = None
    
    # Company registration details
    gst_number: Optional[constr(strip_whitespace=True, max_length=50)] = None
    pan_number: Optional[constr(strip_whitespace=True, max_length=50)] = None
    entity_type: Optional[constr(strip_whitespace=True, max_length=100)] = None
    annual_turnover: Optional[constr(strip_whitespace=True, max_length=255)] = None
    business_vintage: Optional[constr(strip_whitespace=True, max_length=100)] = None
    number_of_employees: Optional[int] = None
    year_of_incorporation: Optional[int] = None
    registered_office_address: Optional[constr(strip_whitespace=True, max_length=1000)] = None
    business_description: Optional[constr(strip_whitespace=True, max_length=2000)] = None
    
    # Industry & credit profile
    industry: Optional[constr(strip_whitespace=True, max_length=255)] = None
    promoter_cibil_score: Optional[constr(strip_whitespace=True, max_length=50)] = None
    npa_history: Optional[constr(strip_whitespace=True, max_length=100)] = None
    guarantee_available: Optional[constr(strip_whitespace=True, max_length=100)] = None
    current_ratio: Optional[constr(strip_whitespace=True, max_length=50)] = None
    interest_coverage_ratio: Optional[constr(strip_whitespace=True, max_length=50)] = None
    dscr: Optional[constr(strip_whitespace=True, max_length=50)] = None
    
    # Call details
    date_of_first_call: Optional[date] = None
    purpose_of_call: Optional[constr(strip_whitespace=True, max_length=255)] = None
    product_service_discussed: Optional[constr(strip_whitespace=True, max_length=255)] = None
    call_outcome: Optional[constr(strip_whitespace=True, max_length=255)] = None
    
    # Status & lead management
    current_status: Optional[constr(strip_whitespace=True, max_length=100)] = None
    final_outcome: Optional[constr(strip_whitespace=True, max_length=255)] = None
    lead_stage: Optional[constr(strip_whitespace=True, max_length=100)] = None
    last_activity_date: Optional[date] = None
    last_stage_change_date: Optional[datetime] = None
    proposal_shared: Optional[constr(strip_whitespace=True, max_length=50)] = None
    
    # Follow-up details
    next_followup_date: Optional[date] = None
    followup_time: Optional[constr(strip_whitespace=True, max_length=50)] = None
    followup_type: Optional[constr(strip_whitespace=True, max_length=100)] = None
    followup_note: Optional[constr(strip_whitespace=True, max_length=1000)] = None
    
    # Notes & learning
    learning_challenge: Optional[constr(strip_whitespace=True, max_length=1000)] = None
    
    # Sales executive
    sales_executive: Optional[constr(strip_whitespace=True, max_length=255)] = None
    date_of_entry: Optional[date] = None


class LeadCreate(LeadBase):
    pass


class LeadDuplicateCheckRequest(BaseModel):
    company_name: Optional[constr(strip_whitespace=True, max_length=255)] = None
    mobile: Optional[constr(strip_whitespace=True, max_length=50)] = None
    email: Optional[constr(strip_whitespace=True, max_length=255)] = None


class LeadUpdate(BaseModel):
    lead_name: Optional[constr(strip_whitespace=True, min_length=1, max_length=255)] = None
    company_name: Optional[constr(strip_whitespace=True, max_length=255)] = None
    mobile: Optional[constr(strip_whitespace=True, max_length=50)] = None
    alternate_mobile: Optional[constr(strip_whitespace=True, max_length=50)] = None
    email: Optional[constr(strip_whitespace=True, max_length=255)] = None
    company_email: Optional[constr(strip_whitespace=True, max_length=255)] = None
    city: Optional[constr(strip_whitespace=True, max_length=100)] = None
    state: Optional[constr(strip_whitespace=True, max_length=100)] = None
    location: Optional[constr(strip_whitespace=True, max_length=255)] = None
    product_type: Optional[constr(strip_whitespace=True, max_length=100)] = None
    vertical: Optional[constr(strip_whitespace=True, max_length=100)] = None
    sub_product: Optional[constr(strip_whitespace=True, max_length=100)] = None
    funding_amount: Optional[float] = None
    lead_source: Optional[constr(strip_whitespace=True, max_length=100)] = None
    lead_status: Optional[constr(strip_whitespace=True, max_length=100)] = None
    designation: Optional[constr(strip_whitespace=True, max_length=255)] = None
    pipeline_stage: Optional[constr(strip_whitespace=True, max_length=100)] = None
    assigned_to: Optional[UUID] = None
    remarks: Optional[constr(strip_whitespace=True, max_length=1000)] = None
    followup_date: Optional[date] = None
    deal_value: Optional[float] = None
    ageing: Optional[int] = None
    action: Optional[constr(strip_whitespace=True, max_length=255)] = None
    
    # Company registration details
    gst_number: Optional[constr(strip_whitespace=True, max_length=50)] = None
    pan_number: Optional[constr(strip_whitespace=True, max_length=50)] = None
    entity_type: Optional[constr(strip_whitespace=True, max_length=100)] = None
    annual_turnover: Optional[constr(strip_whitespace=True, max_length=255)] = None
    business_vintage: Optional[constr(strip_whitespace=True, max_length=100)] = None
    number_of_employees: Optional[int] = None
    year_of_incorporation: Optional[int] = None
    registered_office_address: Optional[constr(strip_whitespace=True, max_length=1000)] = None
    business_description: Optional[constr(strip_whitespace=True, max_length=2000)] = None
    
    # Industry & credit profile
    industry: Optional[constr(strip_whitespace=True, max_length=255)] = None
    credit_rating: Optional[constr(strip_whitespace=True, max_length=100)] = None
    rating_date: Optional[constr(strip_whitespace=True, max_length=50)] = None
    rating_agency: Optional[constr(strip_whitespace=True, max_length=255)] = None
    promoter_cibil_score: Optional[constr(strip_whitespace=True, max_length=50)] = None
    npa_history: Optional[constr(strip_whitespace=True, max_length=100)] = None
    guarantee_available: Optional[constr(strip_whitespace=True, max_length=100)] = None
    current_ratio: Optional[constr(strip_whitespace=True, max_length=50)] = None
    interest_coverage_ratio: Optional[constr(strip_whitespace=True, max_length=50)] = None
    dscr: Optional[constr(strip_whitespace=True, max_length=50)] = None
    lender_related_detail: Optional[constr(strip_whitespace=True, max_length=1000)] = None
    
    # Call details
    date_of_first_call: Optional[date] = None
    purpose_of_call: Optional[constr(strip_whitespace=True, max_length=255)] = None
    product_service_discussed: Optional[constr(strip_whitespace=True, max_length=255)] = None
    call_outcome: Optional[constr(strip_whitespace=True, max_length=255)] = None
    
    # Status & lead management
    current_status: Optional[constr(strip_whitespace=True, max_length=100)] = None
    final_outcome: Optional[constr(strip_whitespace=True, max_length=255)] = None
    lead_stage: Optional[constr(strip_whitespace=True, max_length=100)] = None
    last_activity_date: Optional[date] = None
    last_stage_change_date: Optional[datetime] = None
    proposal_shared: Optional[constr(strip_whitespace=True, max_length=50)] = None
    
    # Follow-up details
    next_followup_date: Optional[date] = None
    followup_time: Optional[constr(strip_whitespace=True, max_length=50)] = None
    followup_type: Optional[constr(strip_whitespace=True, max_length=100)] = None
    followup_note: Optional[constr(strip_whitespace=True, max_length=1000)] = None
    
    # Notes & learning
    learning_challenge: Optional[constr(strip_whitespace=True, max_length=1000)] = None
    
    # Sales executive
    sales_executive: Optional[constr(strip_whitespace=True, max_length=255)] = None
    date_of_entry: Optional[date] = None


class LeadResponse(LeadBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    pipeline_stage: Optional[str] = None
    
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

    # Computed ownership / mode metadata
    mode: Optional[str] = None
    lock_info: Optional[Dict[str, Any]] = None

    class Config:
        from_attributes = True


class OwnershipTransferRequest(BaseModel):
    new_owner_id: UUID
    transfer_reason: constr(strip_whitespace=True, max_length=500)
