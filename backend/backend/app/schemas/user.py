from __future__ import annotations
from datetime import datetime
from enum import Enum
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field, SecretStr, constr, validator


class UserRole(str, Enum):
    admin = "Admin"
    manager = "Manager"
    employee = "Employee"


class UserStatus(str, Enum):
    active = "active"
    inactive = "inactive"


class UserBase(BaseModel):
    full_name: constr(strip_whitespace=True, min_length=1, max_length=255)
    email: EmailStr
    mobile: Optional[constr(strip_whitespace=True, max_length=50)] = None
    role: UserRole = UserRole.employee
    department: Optional[constr(strip_whitespace=True, max_length=100)] = None
    status: UserStatus = UserStatus.active


class UserCreate(UserBase):
    password: constr(min_length=8, max_length=128)

    @validator("password")
    def password_strength(cls, value: str) -> str:
        if len(value) < 8:
            raise ValueError("Password must contain at least 8 characters")
        if not any(char.islower() for char in value):
            raise ValueError("Password must include at least one lowercase letter")
        if not any(char.isupper() for char in value):
            raise ValueError("Password must include at least one uppercase letter")
        if not any(char.isdigit() for char in value):
            raise ValueError("Password must include at least one digit")
        if not any(char in "!@#$%^&*()-_=+[]{}|;:,<.>/?" for char in value):
            raise ValueError("Password must include at least one special character")
        return value


class UserUpdate(BaseModel):
    full_name: Optional[constr(strip_whitespace=True, min_length=1, max_length=255)] = None
    email: Optional[EmailStr] = None
    mobile: Optional[constr(strip_whitespace=True, max_length=50)] = None
    password: Optional[constr(min_length=8, max_length=128)] = None
    role: Optional[UserRole] = None
    department: Optional[constr(strip_whitespace=True, max_length=100)] = None
    status: Optional[UserStatus] = None

    @validator("password")
    def password_strength(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return value
        if len(value) < 8:
            raise ValueError("Password must contain at least 8 characters")
        if not any(char.islower() for char in value):
            raise ValueError("Password must include at least one lowercase letter")
        if not any(char.isupper() for char in value):
            raise ValueError("Password must include at least one uppercase letter")
        if not any(char.isdigit() for char in value):
            raise ValueError("Password must include at least one digit")
        if not any(char in "!@#$%^&*()-_=+[]{}|;:,<.>/?" for char in value):
            raise ValueError("Password must include at least one special character")
        return value


class UserResponse(UserBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class LoginRequest(BaseModel):
    email: EmailStr
    password: SecretStr


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = Field(default="bearer")
