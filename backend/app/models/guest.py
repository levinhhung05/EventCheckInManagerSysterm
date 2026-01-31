"""
Guest data models.
"""
from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime


class GuestBase(BaseModel):
    """Base guest model."""
    full_name: str = Field(..., min_length=1)
    phone: str = Field(..., min_length=10)
    company: Optional[str] = None
    email: Optional[EmailStr] = None
    notes: Optional[str] = None


class GuestCreate(GuestBase):
    """Model for creating a guest."""
    pass


class GuestUpdate(BaseModel):
    """Model for updating a guest."""
    full_name: Optional[str] = Field(None, min_length=1)
    phone: Optional[str] = None
    company: Optional[str] = None
    email: Optional[EmailStr] = None
    notes: Optional[str] = None


class GuestInDB(GuestBase):
    """Guest model as stored in database."""
    id: str
    event_id: str
    table_id: Optional[str] = None
    seat_id: Optional[str] = None
    checked_in: bool = False
    checked_in_at: Optional[datetime] = None
    checked_out_at: Optional[datetime] = None
    checked_in_by: Optional[str] = None  # Staff user ID
    created_at: datetime
    updated_at: datetime


class Guest(GuestInDB):
    """Guest model for API responses."""
    pass


class GuestImportRow(BaseModel):
    """Model for importing guest from CSV/Excel."""
    full_name: str
    phone: str
    company: Optional[str] = None
    email: Optional[str] = None
    notes: Optional[str] = None


class GuestImportRequest(BaseModel):
    """Request model for bulk guest import."""
    guests: list[GuestImportRow]


class GuestImportResponse(BaseModel):
    """Response model for bulk guest import."""
    success: int
    failed: int
    errors: list[str] = []


class CheckInRequest(BaseModel):
    """Request model for checking in a guest."""
    guest_id: str


class CheckInResponse(BaseModel):
    """Response model for check-in operation."""
    guest: Guest
    message: str


class GuestSearchResult(BaseModel):
    """Search result model."""
    guests: list[Guest]
    total: int
