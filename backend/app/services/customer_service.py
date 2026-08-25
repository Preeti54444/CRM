from datetime import datetime
from typing import Optional
from uuid import UUID, uuid4

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from ..models.customer_profile import CustomerProfile
from ..models.lead import Lead
from ..models.lender_case import LenderCase
from ..schemas.customer_profile import CustomerProfileCreate, CustomerProfileUpdate, LeadDetails
from ..schemas.timeline import TimelineEventCreate
from ..services.timeline_service import add_timeline_event


def create_customer_profile(db: Session, payload: CustomerProfileCreate) -> CustomerProfile:
    obj = CustomerProfile(
        id=uuid4(),
        lead_id=payload.lead_id,
        company_type=payload.company_type,
        gst_number=payload.gst_number,
        pan_number=payload.pan_number,
        turnover=payload.turnover,
        business_vintage=payload.business_vintage,
        funding_requirement=payload.funding_requirement,
        assigned_rm=payload.assigned_rm,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.add(obj)
    db.commit()
    db.refresh(obj)
    add_timeline_event(
        db,
        TimelineEventCreate(
            lead_id=obj.lead_id,
            customer_id=obj.id,
            event_type="Customer Profile Created",
            description=f"Customer profile for lead {obj.lead_id} was created.",
        ),
        creator_id=None,
    )
    return obj


def get_customer_by_id(db: Session, customer_id: UUID) -> Optional[CustomerProfile]:
    return db.query(CustomerProfile).filter(CustomerProfile.id == customer_id).first()


def get_customer_with_lead_details(db: Session, customer_id: UUID) -> Optional[dict]:
    """Retrieve customer profile with associated lead details and lender cases"""
    customer = db.query(CustomerProfile).filter(CustomerProfile.id == customer_id).first()
    if not customer:
        return None
    
    lead = db.query(Lead).filter(Lead.id == customer.lead_id).first()
    
    # Fetch lender cases for this lead
    lender_cases = db.query(LenderCase).filter(LenderCase.lead_id == customer.lead_id).all()
    lender_cases_list = []
    for case in lender_cases:
        lender_cases_list.append({
            "id": case.id,
            "application_id": case.application_id,
            "lead_id": case.lead_id,
            "lead_company": case.lead_company,
            "lender_name": case.lender_name,
            "product_type": case.product_type,
            "applied_loan_amount": float(case.applied_loan_amount) if case.applied_loan_amount else None,
            "application_status": case.application_status,
            "contacted_person_name": case.contacted_person_name,
            "mobile_no": case.mobile_no,
            "linkedin_url": case.linkedin_url,
            "outcome_of_call": case.outcome_of_call,
            "lender_onboarding_form": case.lender_onboarding_form,
            "contact_status": case.contact_status,
            "bank_login_date": case.bank_login_date,
            "bank_reference_number": case.bank_reference_number,
            "sanction_date": case.sanction_date,
            "interest_rate": float(case.interest_rate) if case.interest_rate else None,
            "tenure_months": case.tenure_months,
            "emi_amount": float(case.emi_amount) if case.emi_amount else None,
            "disbursal_amount": float(case.disbursal_amount) if case.disbursal_amount else None,
            "disbursal_date": case.disbursal_date,
            "expected_payout_percent": float(case.expected_payout_percent) if case.expected_payout_percent else None,
            "actual_payout_received": float(case.actual_payout_received) if case.actual_payout_received else None,
            "payout_date": case.payout_date,
            "rejection_reason": case.rejection_reason,
            "created_at": case.created_at,
            "updated_at": case.updated_at
        })
    
    customer_dict = {
        "id": customer.id,
        "lead_id": customer.lead_id,
        "company_type": customer.company_type,
        "gst_number": customer.gst_number,
        "pan_number": customer.pan_number,
        "turnover": customer.turnover,
        "business_vintage": customer.business_vintage,
        "funding_requirement": customer.funding_requirement,
        "assigned_rm": customer.assigned_rm,
        "created_at": customer.created_at,
        "updated_at": customer.updated_at,
        "lead_details": LeadDetails.from_orm(lead) if lead else None,
        "lender_cases": lender_cases_list
    }
    
    return customer_dict


def list_customers(db: Session) -> list[CustomerProfile]:
    """Retrieve all customer profiles"""
    return db.query(CustomerProfile).all()


def list_customers_with_lead_details(db: Session) -> list[dict]:
    """Retrieve all customer profiles with associated lead details and lender cases"""
    customers = db.query(CustomerProfile).all()
    result = []
    
    for customer in customers:
        lead = db.query(Lead).filter(Lead.id == customer.lead_id).first()
        
        # Fetch lender cases for this lead
        lender_cases = db.query(LenderCase).filter(LenderCase.lead_id == customer.lead_id).all()
        lender_cases_list = []
        for case in lender_cases:
            lender_cases_list.append({
                "id": case.id,
                "application_id": case.application_id,
                "lead_id": case.lead_id,
                "lead_company": case.lead_company,
                "lender_name": case.lender_name,
                "product_type": case.product_type,
                "applied_loan_amount": float(case.applied_loan_amount) if case.applied_loan_amount else None,
                "application_status": case.application_status,
                "contacted_person_name": case.contacted_person_name,
                "mobile_no": case.mobile_no,
                "linkedin_url": case.linkedin_url,
                "outcome_of_call": case.outcome_of_call,
                "lender_onboarding_form": case.lender_onboarding_form,
                "contact_status": case.contact_status,
                "bank_login_date": case.bank_login_date,
                "bank_reference_number": case.bank_reference_number,
                "sanction_date": case.sanction_date,
                "interest_rate": float(case.interest_rate) if case.interest_rate else None,
                "tenure_months": case.tenure_months,
                "emi_amount": float(case.emi_amount) if case.emi_amount else None,
                "disbursal_amount": float(case.disbursal_amount) if case.disbursal_amount else None,
                "disbursal_date": case.disbursal_date,
                "expected_payout_percent": float(case.expected_payout_percent) if case.expected_payout_percent else None,
                "actual_payout_received": float(case.actual_payout_received) if case.actual_payout_received else None,
                "payout_date": case.payout_date,
                "rejection_reason": case.rejection_reason,
                "created_at": case.created_at,
                "updated_at": case.updated_at
            })
        
        customer_dict = {
            "id": customer.id,
            "lead_id": customer.lead_id,
            "company_type": customer.company_type,
            "gst_number": customer.gst_number,
            "pan_number": customer.pan_number,
            "turnover": customer.turnover,
            "business_vintage": customer.business_vintage,
            "funding_requirement": customer.funding_requirement,
            "assigned_rm": customer.assigned_rm,
            "created_at": customer.created_at,
            "updated_at": customer.updated_at,
            "lead_details": LeadDetails.from_orm(lead) if lead else None,
            "lender_cases": lender_cases_list
        }
        result.append(customer_dict)
    
    return result


def update_customer(db: Session, obj: CustomerProfile, payload: CustomerProfileUpdate) -> CustomerProfile:
    for field, value in payload.__dict__.items():
        if value is not None:
            setattr(obj, field, value)
    obj.updated_at = datetime.utcnow()
    db.add(obj)
    db.commit()
    db.refresh(obj)
    add_timeline_event(
        db,
        TimelineEventCreate(
            lead_id=obj.lead_id,
            customer_id=obj.id,
            event_type="Customer Profile Updated",
            description=f"Customer profile for lead {obj.lead_id} was updated.",
        ),
        creator_id=None,
    )
    return obj


def delete_customer_profile(db: Session, obj: CustomerProfile) -> None:
    db.delete(obj)
    db.commit()
