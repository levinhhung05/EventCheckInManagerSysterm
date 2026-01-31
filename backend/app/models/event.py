"""
Event data models.
"""
from pydantic import BaseModel, Field
from typing import Optional
from enum import Enum
from datetime import datetime


class EventStatus(str, Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    ARCHIVED = "archived"

# ===== INPUT MODELS =====

class EventBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    date: datetime
    location: str
    description: Optional[str] = None

class EventCreate(EventBase):
    pass

class EventUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    date: Optional[datetime] = None
    location: Optional[str] = None
    description: Optional[str] = None
    status: Optional[EventStatus] = None

class EventDuplicateRequest(BaseModel):
    new_name: str
    new_date: datetime
    copy_layout: bool = True
    copy_guests: bool = False

class EventStaffAssignment(BaseModel):
    user_id: str
    assigned: bool


# ===== RESPONSE MODELS =====

class Event(BaseModel):
    id: str
    name: str
    date: datetime
    location: str

    description: Optional[str] = None
    status: Optional[str] = None

    created_by: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    floor_plan_url: Optional[str] = None


class EventSummary(BaseModel):
    id: str
    name: str
    date: datetime
    location: str
    status: Optional[str] = None

    total_guests: int = 0
    checked_in_count: int = 0
    checked_out_count: int = 0
    total_seats: int = 0

class EventInDB(Event):
    pass