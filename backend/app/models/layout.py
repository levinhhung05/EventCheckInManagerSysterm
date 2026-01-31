"""
Layout and table data models.
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from enum import Enum


class TableShape(str, Enum):
    """Table shape enumeration."""
    ROUND = "round"
    RECTANGULAR = "rectangular"


class SeatStatus(str, Enum):
    """Seat status enumeration."""
    UNASSIGNED = "unassigned"
    ASSIGNED = "assigned"
    CHECKED_IN = "checked_in"


class Position(BaseModel):
    """2D position coordinates."""
    x: float
    y: float


class Seat(BaseModel):
    """Seat model with relative positioning to table."""
    id: str
    position: Position  # Relative to table center
    rotation: float = 0.0
    guest_id: Optional[str] = None
    status: SeatStatus = SeatStatus.UNASSIGNED


class TableBase(BaseModel):
    """Base table model."""
    shape: TableShape
    position: Position  # Absolute position on canvas
    rotation: float = 0.0
    seats: List[Seat] = []


class TableCreate(BaseModel):
    """Model for creating a table."""
    shape: TableShape
    position: Position
    width: float = Field(..., gt=0)
    height: float = Field(..., gt=0)
    num_seats: int = Field(..., ge=1, le=20)
    rotation: float = 0.0


class TableUpdate(BaseModel):
    """Model for updating a table."""
    position: Optional[Position] = None
    rotation: Optional[float] = None
    width: Optional[float] = Field(None, gt=0)
    height: Optional[float] = Field(None, gt=0)


class TableInDB(TableBase):
    """Table model as stored in database."""
    id: str
    width: float
    height: float


class Table(TableInDB):
    """Table model for API responses."""
    pass


class LayoutConfig(BaseModel):
    """Layout configuration settings."""
    grid_size: int = 20
    snap_to_grid: bool = True
    canvas_width: int = 2000
    canvas_height: int = 1500
    show_grid: bool = True


class Layout(BaseModel):
    """Complete layout model."""
    tables: List[Table] = []
    config: Optional[LayoutConfig] = None
    floor_plan_url: Optional[str] = None


class LayoutUpdate(BaseModel):
    """Model for updating layout."""
    tables: Optional[List[TableInDB]] = None
    config: Optional[LayoutConfig] = None
    floor_plan_url: Optional[str] = None


class SeatAssignment(BaseModel):
    """Model for assigning a guest to a seat."""
    table_id: str
    seat_id: str
    guest_id: str
