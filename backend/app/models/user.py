"""
User data models for authentication and authorization.
"""
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from enum import Enum
from datetime import datetime


class UserRole(str, Enum):
    """User role enumeration."""
    SUPER_ADMIN = "super_admin"
    ADMIN = "admin"
    STAFF = "staff"


class UserBase(BaseModel):
    """Base user model with common fields."""
    email: EmailStr
    full_name: str
    role: UserRole
    is_active: bool = True


class UserCreate(BaseModel):
    """Model for creating a new user."""
    email: EmailStr
    password: str = Field(..., min_length=6)
    full_name: str
    role: UserRole


class UserUpdate(BaseModel):
    """Model for updating user information."""
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    role: Optional[UserRole] = None
    password: Optional[str] = Field(None, min_length=6)
    is_active: Optional[bool] = None


class UserInDB(UserBase):
    """User model as stored in database."""
    id: str
    hashed_password: str
    created_at: datetime
    updated_at: datetime
    assigned_events: List[str] = []  # List of event IDs for staff
    reset_token: Optional[str] = None
    reset_token_expires: Optional[datetime] = None


class User(UserBase):
    """User model for API responses (without password)."""
    id: str
    created_at: datetime
    assigned_events: List[str] = []


class Token(BaseModel):
    """JWT token response."""
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    """Token payload data."""
    user_id: str
    email: str
    role: UserRole


class LoginRequest(BaseModel):
    """Login request model."""
    email: EmailStr
    password: str


class PasswordChange(BaseModel):
    """Password change request."""
    old_password: str
    new_password: str = Field(..., min_length=6)


class PasswordResetRequest(BaseModel):
    """Request to initiate password reset."""
    email: EmailStr


class PasswordResetConfirm(BaseModel):
    """Request to complete password reset."""
    token: str
    new_password: str = Field(..., min_length=6)
