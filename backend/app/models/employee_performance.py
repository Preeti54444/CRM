"""Employee Performance Tracking Models"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Float, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from ..database import Base


class EmployeePerformanceDaily(Base):
    """Daily employee performance tracking"""
    __tablename__ = "employee_performance_daily"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    date = Column(DateTime, nullable=False, index=True)
    
    # Performance Metrics
    calls_completed = Column(Integer, default=0, nullable=False)
    leads_created = Column(Integer, default=0, nullable=False)
    exploration_calls = Column(Integer, default=0, nullable=False)
    meetings_booked = Column(Integer, default=0, nullable=False)
    
    # Achievement Calculations
    achievement_percentage = Column(Float, default=0.0, nullable=False)
    zone = Column(String(20), default="red", nullable=False)  # green, yellow, red
    
    # Activity Tracking
    last_activity = Column(DateTime, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    employee = relationship("User", foreign_keys=[employee_id])


class EmployeeMidweekReport(Base):
    """Mid-week employee performance report"""
    __tablename__ = "employee_midweek_reports"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    week_start = Column(DateTime, nullable=False)
    week_end = Column(DateTime, nullable=False)
    
    # Performance Metrics
    calls_completed = Column(Integer, default=0, nullable=False)
    leads_completed = Column(Integer, default=0, nullable=False)
    exploration_calls_completed = Column(Integer, default=0, nullable=False)
    
    # Achievement Calculations
    achievement_percentage = Column(Float, default=0.0, nullable=False)
    zone = Column(String(20), default="red", nullable=False)
    
    # Timestamps
    generated_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    employee = relationship("User", foreign_keys=[employee_id])


class EmployeeWeeklyReport(Base):
    """Weekly employee performance report with ranking"""
    __tablename__ = "employee_weekly_reports"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    week_start = Column(DateTime, nullable=False)
    week_end = Column(DateTime, nullable=False)
    
    # Performance Metrics
    total_calls = Column(Integer, default=0, nullable=False)
    total_leads = Column(Integer, default=0, nullable=False)
    total_exploration_calls = Column(Integer, default=0, nullable=False)
    total_meetings = Column(Integer, default=0, nullable=False)
    
    # Achievement Calculations
    achievement_percentage = Column(Float, default=0.0, nullable=False)
    performance_score = Column(Float, default=0.0, nullable=False)
    zone = Column(String(20), default="red", nullable=False)
    rank = Column(Integer, nullable=True)  # Employee ranking for the week
    
    # Timestamps
    generated_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    employee = relationship("User", foreign_keys=[employee_id])


class LogoutOverrideLog(Base):
    """Audit log for admin-approved logout overrides"""
    __tablename__ = "logout_override_logs"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    approved_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    reason = Column(Text, nullable=False)
    
    # Performance Context
    calls_completed = Column(Integer, default=0, nullable=False)
    leads_completed = Column(Integer, default=0, nullable=False)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    employee = relationship("User", foreign_keys=[employee_id])
    admin = relationship("User", foreign_keys=[approved_by])
