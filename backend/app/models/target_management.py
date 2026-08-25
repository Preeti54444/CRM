"""Target Management System Models"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Float, Text, Date, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from ..database import Base


class EmployeeCarryForward(Base):
    """Daily carry-forward tracking for missed targets"""
    __tablename__ = "employee_carry_forward"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    date = Column(Date, nullable=False, index=True)
    week_start = Column(Date, nullable=False)

    carry_forward_calls = Column(Integer, default=0, nullable=False)
    carry_forward_leads = Column(Integer, default=0, nullable=False)

    daily_calls_target = Column(Integer, default=0, nullable=False)
    daily_leads_target = Column(Integer, default=0, nullable=False)
    total_required_calls = Column(Integer, default=0, nullable=False)
    total_required_leads = Column(Integer, default=0, nullable=False)

    calls_completed = Column(Integer, default=0, nullable=False)
    leads_completed = Column(Integer, default=0, nullable=False)
    remaining_calls = Column(Integer, default=0, nullable=False)
    remaining_leads = Column(Integer, default=0, nullable=False)

    is_closed = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    employee = relationship("User", foreign_keys=[employee_id])


class TargetAuditLog(Base):
    """Immutable audit trail for target-related actions"""
    __tablename__ = "target_audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True, index=True)
    actor_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    action = Column(String(100), nullable=False, index=True)
    entity_type = Column(String(50), nullable=True)
    entity_id = Column(String(100), nullable=True)
    details = Column(Text, nullable=True)
    metadata_json = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    employee = relationship("User", foreign_keys=[employee_id])
    actor = relationship("User", foreign_keys=[actor_id])


class EmployeeBadge(Base):
    """Achievement badges earned by employees"""
    __tablename__ = "employee_badges"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    badge_type = Column(String(50), nullable=False, index=True)
    badge_name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    earned_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    week_start = Column(Date, nullable=True)

    employee = relationship("User", foreign_keys=[employee_id])


class TargetEarlyLogoutRequest(Base):
    """Early logout requests due to pending targets"""
    __tablename__ = "target_early_logout_requests"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    reviewer_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    reason = Column(Text, nullable=False)
    supporting_note = Column(Text, nullable=True)
    status = Column(String(20), default="pending", nullable=False)

    remaining_calls = Column(Integer, default=0, nullable=False)
    remaining_leads = Column(Integer, default=0, nullable=False)
    carry_forward_calls = Column(Integer, default=0, nullable=False)
    carry_forward_leads = Column(Integer, default=0, nullable=False)

    reviewed_at = Column(DateTime, nullable=True)
    review_comment = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    employee = relationship("User", foreign_keys=[employee_id])
    reviewer = relationship("User", foreign_keys=[reviewer_id])
