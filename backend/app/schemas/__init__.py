"""Pydantic schemas for FundingSathi CRM."""

from .user import LoginRequest, TokenResponse, UserCreate, UserResponse, UserUpdate, UserRole, UserStatus
from .lead import LeadCreate, LeadResponse, LeadUpdate
from .customer_profile import CustomerProfileCreate, CustomerProfileResponse, CustomerProfileUpdate
from .followup import FollowUpCreate, FollowUpResponse, FollowUpUpdate, FollowUpReminderResponse, FollowUpStatistics, SnoozeRequest
from .timeline import TimelineEventCreate, TimelineEventResponse
from .report import ReportResponse
from .timer import WorkSessionCreate, WorkSessionResponse, WorkSessionStopRequest
from .targets import TargetCreate, TargetResponse, TargetUpdate
from .call import CallCreate, CallResponse, CallUpdate

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
    "CustomerProfileCreate",
    "CustomerProfileResponse",
    "CustomerProfileUpdate",
    "FollowUpCreate",
    "FollowUpResponse",
    "FollowUpUpdate",
    "FollowUpReminderResponse",
    "FollowUpStatistics",
    "SnoozeRequest",
    "TimelineEventCreate",
    "TimelineEventResponse",
    "ReportResponse",
    "WorkSessionCreate",
    "WorkSessionResponse",
    "WorkSessionStopRequest",
    "TargetCreate",
    "TargetResponse",
    "TargetUpdate",
    "CallCreate",
    "CallResponse",
    "CallUpdate",
]
