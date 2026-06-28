from datetime import datetime
from sqlalchemy import Column, Integer, String, Date, DateTime, Float, ForeignKey
from sqlalchemy.dialects.postgresql import UUID

from ..database import Base


class EmployeePerformanceDaily(Base):
    __tablename__ = 'employee_performance_daily'

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False)
    date = Column(Date, nullable=False)
    calls_completed = Column(Integer, default=0)
    leads_created = Column(Integer, default=0)
    exploration_calls = Column(Integer, default=0)
    meetings_booked = Column(Integer, default=0)
    achievement_percentage = Column(Float, default=0.0)
    zone = Column(String(16), default='red')
    last_activity = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)


class EmployeeMidweekReport(Base):
    __tablename__ = 'employee_midweek_reports'

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False)
    week_start = Column(Date, nullable=False)
    week_end = Column(Date, nullable=False)
    calls_completed = Column(Integer, default=0)
    leads_completed = Column(Integer, default=0)
    exploration_calls_completed = Column(Integer, default=0)
    achievement_percentage = Column(Float, default=0.0)
    zone = Column(String(16), default='red')
    generated_at = Column(DateTime, default=datetime.utcnow)


class EmployeeWeeklyReport(Base):
    __tablename__ = 'employee_weekly_reports'

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False)
    week_start = Column(Date, nullable=False)
    week_end = Column(Date, nullable=False)
    total_calls = Column(Integer, default=0)
    total_leads = Column(Integer, default=0)
    total_exploration_calls = Column(Integer, default=0)
    total_meetings = Column(Integer, default=0)
    achievement_percentage = Column(Float, default=0.0)
    performance_score = Column(Float, default=0.0)
    zone = Column(String(16), default='red')
    rank = Column(Integer, nullable=True)
    generated_at = Column(DateTime, default=datetime.utcnow)


class LogoutOverrideLog(Base):
    __tablename__ = 'logout_override_logs'

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False)
    approved_by = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=True)
    reason = Column(String(1000), nullable=False)
    calls_completed = Column(Integer, default=0)
    leads_completed = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
