from pydantic import BaseModel
from typing import Optional, List, Any


class LenderBase(BaseModel):
    name: str
    slug: Optional[str] = None
    logo: Optional[str] = None
    min_turnover: Optional[float] = None
    max_loan: Optional[float] = None
    min_cibil: Optional[int] = None
    roi: Optional[str] = None
    products: Optional[List[str]] = []
    eligible_types: Optional[List[str]] = []
    ticket_min: Optional[float] = None
    ticket_max: Optional[float] = None
    min_vintage: Optional[int] = None
    min_dscr: Optional[float] = None
    requires_atnw_positive: Optional[bool] = False
    requires_owned_property: Optional[bool] = False
    processing_fee: Optional[float] = None
    foreclosure_charges: Optional[float] = None
    hidden_charges: Optional[float] = None
    security_requirement: Optional[str] = None
    property_requirement: Optional[str] = None
    gst: Optional[str] = None
    pan: Optional[str] = None
    cin: Optional[str] = None
    priority_score: Optional[int] = 0
    sla: Optional[str] = None
    average_approval_days: Optional[int] = None
    average_disbursement_days: Optional[int] = None
    historical_approval_rate: Optional[float] = None
    historical_rejection_rate: Optional[float] = None
    active_status: Optional[bool] = True
    extra: Optional[Any] = {}


class LenderCreate(LenderBase):
    pass


class LenderUpdate(LenderBase):
    pass


class LenderResponse(LenderBase):
    id: int

    class Config:
        from_attributes = True
