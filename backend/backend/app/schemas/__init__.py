"""Pydantic schemas for FundingSathi CRM."""

from .user import LoginRequest, TokenResponse, UserCreate, UserResponse, UserUpdate, UserRole, UserStatus
from .lead import LeadCreate, LeadResponse, LeadUpdate, DuplicateCheckResponse, ExistingLeadInfo
from .customer_profile import CustomerProfileCreate, CustomerProfileResponse, CustomerProfileUpdate
from .followup import FollowUpCreate, FollowUpResponse, FollowUpUpdate
from .timeline import TimelineEventCreate, TimelineEventResponse
from .report import ReportResponse
from .timer import WorkSessionCreate, WorkSessionResponse, WorkSessionStopRequest
from .targets import TargetCreate, TargetResponse, TargetUpdate

__all__ = [
    "LoginRequest",
    "TokenResponse",
    "UserCreate",
    "UserResponse",
    "UserUpdate",
    "UserRole",
    "UserStatus",
    "LeadCreate",
    "LeadResponse",
    "LeadUpdate",
    "DuplicateCheckResponse",
    "ExistingLeadInfo",
    "CustomerProfileCreate",
    "CustomerProfileResponse",
    "CustomerProfileUpdate",
    "FollowUpCreate",
    "FollowUpResponse",
    "FollowUpUpdate",
    "TimelineEventCreate",
    "TimelineEventResponse",
    "ReportResponse",
    "WorkSessionCreate",
    "WorkSessionResponse",
    "WorkSessionStopRequest",
    "TargetCreate",
    "TargetResponse",
    "TargetUpdate",
]
