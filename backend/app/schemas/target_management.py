"""Pydantic schemas for Target Management System"""
from datetime import datetime, date
from typing import Optional, List
from pydantic import BaseModel, Field
from uuid import UUID


class TodayTargetPanel(BaseModel):
    """Today's Target panel data for employee dashboard"""
    employee_id: UUID
    employee_name: str
    date: date

    # Calls
    daily_calls_target: int = 0
    carry_forward_calls: int = 0
    total_required_calls: int = 0
    calls_completed: int = 0
    calls_remaining: int = 0
    calls_progress_pct: float = 0.0

    # Leads
    daily_leads_target: int = 0
    carry_forward_leads: int = 0
    total_required_leads: int = 0
    leads_completed: int = 0
    leads_remaining: int = 0
    leads_progress_pct: float = 0.0

    # Overall
    overall_progress_pct: float = 0.0
    status: str = "On Track"
    zone: str = "gray"
    expected_completion_time: Optional[str] = None

    # Weekly & Mid-week
    weekly_calls_completed: int = 0
    weekly_leads_completed: int = 0
    weekly_calls_target: int = 0
    weekly_leads_target: int = 0
    weekly_progress_pct: float = 0.0

    midweek_calls_completed: int = 0
    midweek_leads_completed: int = 0
    midweek_calls_target: int = 0
    midweek_leads_target: int = 0
    midweek_progress_pct: float = 0.0
    midweek_risk_level: str = "low"

    performance_score: float = 0.0
    current_rank: Optional[int] = None
    badges: List[str] = []


class AdminEmployeeGridRow(BaseModel):
    """Admin employee performance grid row"""
    employee_id: UUID
    employee_name: str
    today_calls: int = 0
    today_leads: int = 0
    remaining_calls: int = 0
    remaining_leads: int = 0
    carry_forward_calls: int = 0
    carry_forward_leads: int = 0
    daily_pct: float = 0.0
    weekly_pct: float = 0.0
    midweek_pct: float = 0.0
    status: str = "On Track"
    zone: str = "gray"
    last_activity: Optional[datetime] = None
    logout_eligible: bool = False
    office_login_time: Optional[str] = None
    expected_finish_time: Optional[str] = None
    performance_trend: str = "stable"


class AdminTargetKPIs(BaseModel):
    """Admin dashboard KPI cards for target management"""
    green_zone_employees: int = 0
    yellow_zone_employees: int = 0
    red_zone_employees: int = 0
    gray_zone_employees: int = 0
    highest_performer: Optional[dict] = None
    lowest_performer: Optional[dict] = None
    total_calls_today: int = 0
    total_leads_today: int = 0
    weekly_completion_pct: float = 0.0
    overall_productivity: float = 0.0
    pending_calls: int = 0
    pending_leads: int = 0
    carry_forward_calls: int = 0
    carry_forward_leads: int = 0
    avg_calls_per_employee: float = 0.0
    avg_leads_per_employee: float = 0.0


class TargetLogoutCheckResponse(BaseModel):
    """Enhanced logout check with carry-forward"""
    can_logout: bool
    required_calls: int
    required_leads: int
    completed_calls: int
    completed_leads: int
    carry_forward_calls: int = 0
    carry_forward_leads: int = 0
    remaining_calls: int = 0
    remaining_leads: int = 0
    message: str
    has_approved_early_logout: bool = False


class TargetEarlyLogoutCreate(BaseModel):
    reason: str = Field(..., min_length=5)
    supporting_note: Optional[str] = None


class TargetEarlyLogoutReview(BaseModel):
    request_id: int
    decision: str = Field(..., pattern="^(approved|rejected)$")
    comment: Optional[str] = None


class TargetEarlyLogoutResponse(BaseModel):
    id: int
    employee_id: UUID
    employee_name: Optional[str] = None
    reason: str
    supporting_note: Optional[str] = None
    status: str
    remaining_calls: int
    remaining_leads: int
    carry_forward_calls: int
    carry_forward_leads: int
    reviewer_name: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    review_comment: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class TargetAuditLogResponse(BaseModel):
    id: int
    employee_id: Optional[UUID] = None
    employee_name: Optional[str] = None
    actor_id: Optional[UUID] = None
    actor_name: Optional[str] = None
    action: str
    entity_type: Optional[str] = None
    entity_id: Optional[str] = None
    details: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class EmployeeBadgeResponse(BaseModel):
    id: int
    badge_type: str
    badge_name: str
    description: Optional[str] = None
    earned_at: datetime

    class Config:
        from_attributes = True
