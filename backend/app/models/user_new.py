"""Enhanced User/Employee Model"""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Boolean
from sqlalchemy.dialects.postgresql import UUID

from ..database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, unique=True, index=True)
    
    # Basic Info
    full_name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    mobile = Column(String(50), nullable=True)
    
    # Authentication
    password_hash = Column(String(255), nullable=False)
    
    # Role & Permissions
    role = Column(String(50), nullable=False, default="Employee")  # Admin, Manager, Sales, Telecaller, Viewer
    department = Column(String(100), nullable=True)
    
    # Status
    status = Column(String(50), nullable=False, default="active")  # active, inactive, suspended
    is_active = Column(Boolean, default=True)
    
    # Employee Details
    employee_id = Column(String(100), unique=True, nullable=True)
    designation = Column(String(100), nullable=True)
    joining_date = Column(DateTime, nullable=True)
    reporting_manager_id = Column(UUID(as_uuid=True), nullable=True)
    
    # Contact Info
    office_phone = Column(String(50), nullable=True)
    office_email = Column(String(255), nullable=True)
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    last_login = Column(DateTime, nullable=True)
