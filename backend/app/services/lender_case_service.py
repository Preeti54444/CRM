from sqlalchemy.orm import Session
from ..models.lender_case import LenderCase
from typing import Dict, Any, List
from datetime import datetime


def create_lender_case(db: Session, payload: Dict[str, Any], creator=None, created_by_name: str = None) -> LenderCase:
    # Map payload keys to model fields
    lc = LenderCase(
        application_id=payload.get('application_id') or payload.get('applicationId') or payload.get('applicationId') ,
        lead_id=payload.get('lead_id') or payload.get('leadId'),
        parent_lead_id=payload.get('parent_lead_id') or payload.get('parentLeadId') or payload.get('parentLeadId'),
        lead_company=payload.get('lead_company') or payload.get('leadCompany'),
        lender_name=payload.get('lender_name') or payload.get('lenderName') or payload.get('lender') or 'Unknown',
        product_type=payload.get('product_type') or payload.get('productType'),
        applied_loan_amount=payload.get('applied_loan_amount') or payload.get('appliedAmount') or payload.get('loanAmount') or 0,
        application_status=payload.get('application_status') or payload.get('applicationStatus') or '',
        contacted_person_name=payload.get('contacted_person_name') or payload.get('contactPerson'),
        mobile_no=payload.get('mobile_no') or payload.get('contactMobile') or payload.get('mobNo'),
        linkedin_url=payload.get('linkedin_url') or payload.get('linkedInUrl'),
        outcome_of_call=payload.get('outcome_of_call') or payload.get('callOutcome'),
        lender_onboarding_form=payload.get('lender_onboarding_form') or payload.get('onboardingFormSubmitted'),
        contact_status=payload.get('contact_status') or payload.get('contactStatus'),
        bank_login_date=payload.get('bank_login_date') or payload.get('bankLoginDate'),
        bank_reference_number=payload.get('bank_reference_number') or payload.get('bankReferenceNumber'),
        sanction_date=payload.get('sanction_date') or payload.get('sanctionDate'),
        interest_rate=payload.get('interest_rate') or payload.get('interestRate'),
        tenure_months=payload.get('tenure_months') or payload.get('tenureMonths'),
        emi_amount=payload.get('emi_amount') or payload.get('emiAmount'),
        disbursal_amount=payload.get('disbursal_amount') or payload.get('disbursalAmount'),
        disbursal_date=payload.get('disbursal_date') or payload.get('disbursalDate'),
        expected_payout_percent=payload.get('expected_payout_percent') or payload.get('expectedPayoutPercent'),
        actual_payout_received=payload.get('actual_payout_received') or payload.get('actualPayoutReceived'),
        payout_date=payload.get('payout_date') or payload.get('payoutDate'),
        tat_tracker=payload.get('tat_tracker') or payload.get('tatTracker') or {},
        rejection_reason=payload.get('rejection_reason') or payload.get('rejectionReason'),
        remarks=payload.get('remarks') or payload.get('remark') or payload.get('remarks'),
        created_by=creator,
        created_by_name=created_by_name
    )
    db.add(lc)
    db.commit()
    db.refresh(lc)
    return lc


def get_lender_case_by_application_id(db: Session, application_id: str) -> LenderCase | None:
    return db.query(LenderCase).filter(LenderCase.application_id == application_id).first()


def delete_lender_case(db: Session, obj: LenderCase) -> None:
    db.delete(obj)
    db.commit()


def list_lender_cases_for_lead(db: Session, lead_id: int | None = None, limit: int = 200) -> List[Dict[str, Any]]:
    query = db.query(LenderCase).order_by(LenderCase.updated_at.desc()).limit(limit)
    if lead_id is not None:
        query = query.filter(LenderCase.lead_id == lead_id)
    return query.all()
