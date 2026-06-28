"""Pydantic Schemas for Lead and Related Models"""
from datetime import datetime, date
from typing import Optional
from pydantic import BaseModel, EmailStr


# ═══ LEAD SCHEMAS ═══
class LeadBase(BaseModel):
    lead_name: str
    email: Optional[EmailStr] = None
    mobile: Optional[str] = None
    alternate_mobile: Optional[str] = None
    company_name: Optional[str] = None
    company_email: Optional[str] = None
    location: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    gst_number: Optional[str] = None
    pan_number: Optional[str] = None
    entity_type: Optional[str] = None
    annual_turnover: Optional[str] = None
    number_of_employees: Optional[int] = None
    year_of_incorporation: Optional[int] = None
    registered_office_address: Optional[str] = None
    business_description: Optional[str] = None
    product_type: Optional[str] = None
    funding_amount: Optional[float] = None
    date_of_entry: Optional[date] = None
    lead_source: Optional[str] = None
    date_of_first_call: Optional[date] = None
    purpose_of_call: Optional[str] = None
    product_service_discussed: Optional[str] = None
    call_outcome: Optional[str] = None
    lead_status: str = "New Lead"
    current_status: Optional[str] = None
    final_outcome: Optional[str] = None
    proposal_shared: Optional[str] = None
    next_followup_date: Optional[date] = None
    deal_value_if_closed: Optional[str] = None
    remarks: Optional[str] = None
    learning_challenge: Optional[str] = None


class LeadCreate(LeadBase):
    pass


class LeadUpdate(BaseModel):
    lead_name: Optional[str] = None
    email: Optional[str] = None
    mobile: Optional[str] = None
    lead_status: Optional[str] = None
    current_status: Optional[str] = None
    remarks: Optional[str] = None


class LeadResponse(LeadBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ═══ LOAN APPLICATION SCHEMAS ═══
class LoanApplicationBase(BaseModel):
    application_id: str
    lead_id: Optional[int] = None
    lender_name: str
    product_type: Optional[str] = None
    applied_loan_amount: Optional[float] = None
    application_status: str = "Proposal Shared"
    contacted_person_name: Optional[str] = None
    contact_mobile: Optional[str] = None
    linkedin_url: Optional[str] = None
    call_outcome: Optional[str] = None
    lender_onboarding_form: str = "No"
    contact_status: Optional[str] = None
    bank_login_date: Optional[date] = None
    bank_reference_number: Optional[str] = None
    sanction_date: Optional[date] = None
    interest_rate: Optional[float] = None
    tenure_months: Optional[int] = None
    emi_amount: Optional[float] = None
    disbursal_amount: Optional[float] = None
    disbursal_date: Optional[date] = None
    expected_payout_percent: Optional[float] = None
    actual_payout_received: Optional[float] = None
    payout_date: Optional[date] = None
    tat_tracker: Optional[str] = None
    rejection_reason: Optional[str] = None
    remarks: Optional[str] = None


class LoanApplicationCreate(LoanApplicationBase):
    pass


class LoanApplicationResponse(LoanApplicationBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ═══ LENDER QUERY SCHEMAS ═══
class LenderQueryBase(BaseModel):
    query_id: str
    application_id: str
    description: str
    status: str = "Open"
    priority: str = "Normal"
    assigned_handler: Optional[str] = None
    required_documents: Optional[str] = None


class LenderQueryCreate(LenderQueryBase):
    pass


class LenderQueryResponse(LenderQueryBase):
    id: int
    created_at: datetime
    updated_at: datetime
    resolved_at: Optional[datetime] = None

    class Config:
        from_attributes = True
