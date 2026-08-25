from __future__ import annotations
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, constr, Field


class ContactBase(BaseModel):
    contact_id: Optional[constr(strip_whitespace=True, max_length=100)] = None
    contact_name: constr(strip_whitespace=True, min_length=1, max_length=255)
    designation: Optional[constr(strip_whitespace=True, max_length=255)] = None
    phone: Optional[constr(strip_whitespace=True, max_length=50)] = None
    alternate_phone: Optional[constr(strip_whitespace=True, max_length=50)] = None
    email: Optional[constr(strip_whitespace=True, max_length=255)] = None
    alternate_email: Optional[constr(strip_whitespace=True, max_length=255)] = None
    company_name: Optional[constr(strip_whitespace=True, max_length=255)] = None
    company_registration_number: Optional[constr(strip_whitespace=True, max_length=100)] = None
    lead_id: Optional[int] = None
    contact_status: Optional[constr(strip_whitespace=True, max_length=50)] = Field(default="Active")
    is_primary_contact: Optional[constr(strip_whitespace=True, max_length=50)] = Field(default="No")
    linkedin_profile: Optional[constr(strip_whitespace=True, max_length=500)] = None
    city: Optional[constr(strip_whitespace=True, max_length=100)] = None
    state: Optional[constr(strip_whitespace=True, max_length=100)] = None
    country: Optional[constr(strip_whitespace=True, max_length=100)] = None
    notes: Optional[str] = None


class ContactCreate(ContactBase):
    pass


class ContactUpdate(BaseModel):
    contact_name: Optional[constr(strip_whitespace=True, min_length=1, max_length=255)] = None
    designation: Optional[constr(strip_whitespace=True, max_length=255)] = None
    phone: Optional[constr(strip_whitespace=True, max_length=50)] = None
    alternate_phone: Optional[constr(strip_whitespace=True, max_length=50)] = None
    email: Optional[constr(strip_whitespace=True, max_length=255)] = None
    alternate_email: Optional[constr(strip_whitespace=True, max_length=255)] = None
    company_name: Optional[constr(strip_whitespace=True, max_length=255)] = None
    company_registration_number: Optional[constr(strip_whitespace=True, max_length=100)] = None
    lead_id: Optional[int] = None
    contact_status: Optional[constr(strip_whitespace=True, max_length=50)] = None
    is_primary_contact: Optional[constr(strip_whitespace=True, max_length=50)] = None
    linkedin_profile: Optional[constr(strip_whitespace=True, max_length=500)] = None
    city: Optional[constr(strip_whitespace=True, max_length=100)] = None
    state: Optional[constr(strip_whitespace=True, max_length=100)] = None
    country: Optional[constr(strip_whitespace=True, max_length=100)] = None
    notes: Optional[str] = None


class ContactResponse(ContactBase):
    id: int
    contact_id: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
