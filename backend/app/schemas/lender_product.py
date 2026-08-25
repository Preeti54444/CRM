from typing import Optional
from pydantic import BaseModel


class LenderProductCreate(BaseModel):
    lender_name: str
    product_name: str
    loan_amount_range: Optional[str] = None
    roi_interest_rate: Optional[str] = None
    tenure: Optional[str] = None
    minimum_turnover: Optional[str] = None
    business_vintage: Optional[str] = None
    processing_fee: Optional[str] = None
    key_features: Optional[str] = None
    key_eligibility_criteria: Optional[str] = None
    product_category: Optional[str] = None
    sub_product: Optional[str] = None
    locations_working_in: Optional[str] = None
    preferred_industry: Optional[str] = None
    negative_industries: Optional[str] = None
    minimum_cibil_credit_score: Optional[str] = None
    minimum_credit_rating_grade: Optional[str] = None
    primary_security_collateral: Optional[str] = None
    guarantee_requirement: Optional[str] = None


class LenderProductResponse(BaseModel):
    id: int
    lender_name: str
    product_name: str
    loan_amount_range: Optional[str]
    roi_interest_rate: Optional[str]
    tenure: Optional[str]
    minimum_turnover: Optional[str]
    business_vintage: Optional[str]
    processing_fee: Optional[str]
    key_features: Optional[str]
    key_eligibility_criteria: Optional[str]
    product_category: Optional[str]
    sub_product: Optional[str]
    locations_working_in: Optional[str]
    preferred_industry: Optional[str]
    negative_industries: Optional[str]
    minimum_cibil_credit_score: Optional[str]
    minimum_credit_rating_grade: Optional[str]
    primary_security_collateral: Optional[str]
    guarantee_requirement: Optional[str]

    class Config:
        from_attributes = True
