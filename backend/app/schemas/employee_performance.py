"""Pydantic schemas for employee performance models"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field
from uuid import UUID


class EmployeePerformanceDailyBase(BaseModel):
    employee_id: UUID
    date: datetime
    calls_completed: int = 0
    leads_created: int = 0
    exploration_calls: int = 0
    meetings_booked: int = 0
    achievement_percentage: float = 0.0
    zone: str = "red"


class EmployeePerformanceDailyCreate(EmployeePerformanceDailyBase):
    pass


class EmployeePerformanceDailyUpdate(BaseModel):
    calls_completed: Optional[int] = None
    leads_created: Optional[int] = None
    exploration_calls: Optional[int] = None
    meetings_booked: Optional[int] = None
    achievement_percentage: Optional[float] = None
    zone: Optional[str] = None
    last_activity: Optional[datetime] = None


class EmployeePerformanceDaily(EmployeePerformanceDailyBase):
    id: int
    last_activity: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class EmployeeMidweekReportBase(BaseModel):
    employee_id: UUID
    week_start: datetime
    week_end: datetime
    calls_completed: int = 0
    leads_completed: int = 0
    exploration_calls_completed: int = 0
    achievement_percentage: float = 0.0
    zone: str = "red"


class EmployeeMidweekReportCreate(EmployeeMidweekReportBase):
    pass


class EmployeeMidweekReport(EmployeeMidweekReportBase):
    id: int
    generated_at: datetime

    class Config:
        from_attributes = True


class EmployeeWeeklyReportBase(BaseModel):
    employee_id: UUID
    week_start: datetime
    week_end: datetime
    total_calls: int = 0
    total_leads: int = 0
    total_exploration_calls: int = 0
    total_meetings: int = 0
    achievement_percentage: float = 0.0
    performance_score: float = 0.0
    zone: str = "red"
    rank: Optional[int] = None


class EmployeeWeeklyReportCreate(EmployeeWeeklyReportBase):
    pass


class EmployeeWeeklyReport(EmployeeWeeklyReportBase):
    id: int
    generated_at: datetime

    class Config:
        from_attributes = True


class LogoutOverrideLogBase(BaseModel):
    employee_id: UUID
    approved_by: UUID
    reason: str
    calls_completed: int = 0
    leads_completed: int = 0


class LogoutOverrideLogCreate(LogoutOverrideLogBase):
    pass


class LogoutOverrideLog(LogoutOverrideLogBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class TargetConfiguration(BaseModel):
    """Fixed target configuration for an employee"""
    employee_name: str
    morning_calls: int
    morning_leads: int
    daily_calls: int
    daily_leads: int
    weekly_calls: int
    weekly_leads: int
    weekly_exploration_calls: int


class PerformanceMetrics(BaseModel):
    """Current performance metrics for an employee"""
    employee_id: UUID
    employee_name: str
    date: datetime
    
    # Today's metrics
    today_calls: int
    today_leads: int
    today_exploration_calls: int
    today_meetings: int
    
    # Weekly metrics
    weekly_calls: int
    weekly_leads: int
    weekly_exploration_calls: int
    weekly_meetings: int
    
    # Achievement
    daily_achievement_percentage: float
    weekly_achievement_percentage: float
    performance_score: float
    
    # Zone
    zone: str
    
    # Targets
    morning_calls_target: int
    morning_leads_target: int
    daily_calls_target: int
    daily_leads_target: int
    weekly_calls_target: int
    weekly_leads_target: int
    weekly_exploration_calls_target: int


class LogoutCheckResponse(BaseModel):
    """Response for logout check"""
    can_logout: bool
    required_calls: int
    required_leads: int
    completed_calls: int
    completed_leads: int
    message: str


class DashboardMetrics(BaseModel):
    """Admin dashboard metrics"""
    total_calls_today: int
    total_calls_this_week: int
    total_leads_this_week: int
    total_exploration_calls_this_week: int
    total_meetings_this_week: int
    
    # Zone counts
    green_zone_employees: int
    yellow_zone_employees: int
    red_zone_employees: int
    
    # Top performer
    top_performer: Optional[dict] = None
    
    # Lowest performer
    lowest_performer: Optional[dict] = None


class EmployeeRanking(BaseModel):
    """Employee ranking information"""
    employee_id: UUID
    employee_name: str
    calls: int
    leads: int
    exploration_calls: int
    performance_score: float
    achievement_percentage: float
    rank: int
    zone: str
