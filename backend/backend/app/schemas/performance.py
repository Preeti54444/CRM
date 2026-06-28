from datetime import date, datetime
from pydantic import BaseModel
from typing import Optional


class EmployeePerformanceDailyBase(BaseModel):
    employee_id: str
    date: date
    calls_completed: int = 0
    leads_created: int = 0
    exploration_calls: int = 0
    meetings_booked: int = 0


class EmployeePerformanceDailyCreate(EmployeePerformanceDailyBase):
    pass


class EmployeePerformanceDailyRead(EmployeePerformanceDailyBase):
    id: int
    achievement_percentage: float
    zone: str
    last_activity: Optional[datetime]
    created_at: Optional[datetime]

    class Config:
        orm_mode = True


class EmployeeMidweekReportRead(BaseModel):
    id: int
    employee_id: str
    week_start: date
    week_end: date
    calls_completed: int
    leads_completed: int
    exploration_calls_completed: int
    achievement_percentage: float
    zone: str
    generated_at: Optional[datetime]

    class Config:
        orm_mode = True


class EmployeeWeeklyReportRead(BaseModel):
    id: int
    employee_id: str
    week_start: date
    week_end: date
    total_calls: int
    total_leads: int
    total_exploration_calls: int
    total_meetings: int
    achievement_percentage: float
    performance_score: float
    zone: str
    rank: Optional[int]
    generated_at: Optional[datetime]

    class Config:
        orm_mode = True


class LogoutOverrideCreate(BaseModel):
    employee_id: str
    approved_by: Optional[str]
    reason: str
    calls_completed: int = 0
    leads_completed: int = 0


class LogoutOverrideRead(LogoutOverrideCreate):
    id: int
    created_at: Optional[datetime]

    class Config:
        orm_mode = True
