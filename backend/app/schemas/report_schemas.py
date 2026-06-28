"""Pydantic Schemas for SOD, EOD, WOD Reports"""
from datetime import datetime, date
from typing import Optional
from pydantic import BaseModel


# ═══ SOD REPORT SCHEMAS ═══
class SODReportBase(BaseModel):
    report_date: datetime
    sales_executive: Optional[str] = None
    email: Optional[str] = None
    territory_region: Optional[str] = None
    target_for_today: Optional[str] = None
    key_meetings_planned: Optional[str] = None
    focus_industry_segment: Optional[str] = None
    support_needed: str = "No"
    support_description: Optional[str] = None
    remarks: Optional[str] = None


class SODReportCreate(SODReportBase):
    created_by_name: str


class SODReportResponse(SODReportBase):
    id: int
    created_by: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ═══ EOD REPORT SCHEMAS ═══
class EODReportBase(BaseModel):
    report_date: datetime
    sales_executive: Optional[str] = None
    email: Optional[str] = None
    number_of_calls: int = 0
    meetings_held: int = 0
    key_clients_spoken: Optional[str] = None
    deals_moved_next_stage: Optional[str] = None
    challenges_faced: Optional[str] = None
    learnings_today: Optional[str] = None
    remarks: Optional[str] = None
    daily_score: Optional[float] = 70


class EODReportCreate(EODReportBase):
    created_by_name: str


class EODReportResponse(EODReportBase):
    id: int
    created_by: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ═══ WOD REPORT SCHEMAS ═══
class WODReportBase(BaseModel):
    week_start: date
    week_end: date
    sales_executive: Optional[str] = None
    email: Optional[str] = None
    weekly_target: Optional[str] = None
    achieved: Optional[str] = None
    deals_closed: Optional[str] = None
    hot_leads_in_pipeline: Optional[str] = None
    key_wins_this_week: Optional[str] = None
    lost_opportunities: Optional[str] = None
    action_plan_next_week: Optional[str] = None
    remarks: Optional[str] = None


class WODReportCreate(WODReportBase):
    created_by_name: str


class WODReportResponse(WODReportBase):
    id: int
    created_by: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
