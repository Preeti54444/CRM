from typing import Optional, Any
from pydantic import BaseModel


class LenderCaseCreate(BaseModel):
    application_id: str
    lead_id: Optional[int] = None
    parent_lead_id: Optional[int] = None
    lead_company: Optional[str] = None
    lender_name: str
    product_type: Optional[str] = None
    applied_loan_amount: Optional[float] = 0
    application_status: Optional[str] = None
    contacted_person_name: Optional[str] = None
    mobile_no: Optional[str] = None
    linkedin_url: Optional[str] = None
    outcome_of_call: Optional[str] = None
    lender_onboarding_form: Optional[str] = None
    contact_status: Optional[str] = None
    bank_login_date: Optional[str] = None
    bank_reference_number: Optional[str] = None
    sanction_date: Optional[str] = None
    interest_rate: Optional[float] = None
    tenure_months: Optional[int] = None
    emi_amount: Optional[float] = None
    disbursal_amount: Optional[float] = None
    disbursal_date: Optional[str] = None
    expected_payout_percent: Optional[float] = None
    actual_payout_received: Optional[float] = None
    payout_date: Optional[str] = None
    tat_tracker: Optional[Any] = None
    rejection_reason: Optional[str] = None
    remarks: Optional[Any] = None


class LenderCaseResponse(BaseModel):
    id: int
    application_id: str
    lender_name: str
    lead_id: Optional[int]

    class Config:
        orm_mode = True
