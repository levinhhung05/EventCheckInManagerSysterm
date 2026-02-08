"""
Layout management API endpoints.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
import uuid
import math

from app.models import (
    Layout, LayoutUpdate, Table, TableCreate, TableUpdate,
    SeatAssignment, Position, Seat, User
)
from app.core.dependencies import get_current_admin_user, get_current_active_user
from app.storage.json_db import db
from app.socket.manager import sio
from datetime import datetime

router = APIRouter()


def generate_seats(num_seats: int, table_shape: str, table_width: float, table_height: float) -> List[dict]:
    """
    Generate seat positions around a table.
    
    Args:
        num_seats: Number of seats to generate
        table_shape: "round" or "rectangular"
        table_width: Table width
        table_height: Table height
        
    Returns:
        List of seat dictionaries with positions relative to table center
    """
    seats = []
    
    if table_shape == "round":
        # Position seats in a circle around the table
        radius = table_width / 2 + 30  # 30px offset from table edge
        angle_step = 360 / num_seats
        
        for i in range(num_seats):
            angle = math.radians(i * angle_step)
            x = radius * math.cos(angle)
            y = radius * math.sin(angle)
            
            seats.append({
                "id": str(uuid.uuid4()),
                "position": {"x": x, "y": y},
                "rotation": (i * angle_step) % 360,
                "guest_id": None,
                "status": "unassigned"
            })
    
    else:  # rectangular
        # Distribute seats around the perimeter
        seats_per_side = [0, 0, 0, 0]  # top, right, bottom, left
        
        # Calculate seats per side (prioritize longer sides)
        if table_width >= table_height:
            seats_per_side[0] = seats_per_side[2] = math.ceil(num_seats / 2 * (table_width / (table_width + table_height)))
            remaining = num_seats - (seats_per_side[0] + seats_per_side[2])
            seats_per_side[1] = seats_per_side[3] = remaining // 2
        else:
            seats_per_side[1] = seats_per_side[3] = math.ceil(num_seats / 2 * (table_height / (table_width + table_height)))
            remaining = num_seats - (seats_per_side[1] + seats_per_side[3])
            seats_per_side[0] = seats_per_side[2] = remaining // 2
        
        # Adjust for any rounding errors
        while sum(seats_per_side) < num_seats:
            seats_per_side[0] += 1
        while sum(seats_per_side) > num_seats:
            seats_per_side[2] -= 1
        
        offset = 30  # Distance from table edge
        
        # Top side
        for i in range(seats_per_side[0]):
            x = -table_width/2 + (table_width / (seats_per_side[0] + 1)) * (i + 1)
            y = -table_height/2 - offset
            seats.append({
                "id": str(uuid.uuid4()),
                "position": {"x": x, "y": y},
                "rotation": 0,
                "guest_id": None,
                "status": "unassigned"
            })
        
        # Right side
        for i in range(seats_per_side[1]):
            x = table_width/2 + offset
            y = -table_height/2 + (table_height / (seats_per_side[1] + 1)) * (i + 1)
            seats.append({
                "id": str(uuid.uuid4()),
                "position": {"x": x, "y": y},
                "rotation": 90,
                "guest_id": None,
                "status": "unassigned"
            })
        
        # Bottom side
        for i in range(seats_per_side[2]):
            x = table_width/2 - (table_width / (seats_per_side[2] + 1)) * (i + 1)
            y = table_height/2 + offset
            seats.append({
                "id": str(uuid.uuid4()),
                "position": {"x": x, "y": y},
                "rotation": 180,
                "guest_id": None,
                "status": "unassigned"
            })
        
        # Left side
        for i in range(seats_per_side[3]):
            x = -table_width/2 - offset
            y = table_height/2 - (table_height / (seats_per_side[3] + 1)) * (i + 1)
            seats.append({
                "id": str(uuid.uuid4()),
                "position": {"x": x, "y": y},
                "rotation": 270,
                "guest_id": None,
                "status": "unassigned"
            })
    
    return seats


@router.get("/{event_id}/layout", response_model=Layout)
async def get_layout(
    event_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """Get event layout."""
    # Verify event exists
    event = db.get_event_by_id(event_id)
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found"
        )
    
    # Check access for staff
    if current_user.role == "staff" and event_id not in current_user.assigned_events:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this event"
        )
    
    tables_data = db.get_layout(event_id)
    tables = [Table(**t) for t in tables_data] if tables_data else []
    
    layout_config = db.get_layout_config(event_id)
    
    return Layout(
        tables=tables,
        config=layout_config.get("config"),
        floor_plan_url=layout_config.get("floor_plan_url")
    )


@router.put("/{event_id}/layout", response_model=Layout)
async def update_layout(
    event_id: str,
    layout_update: LayoutUpdate,
    current_user: User = Depends(get_current_admin_user),
):
    if not db.get_event_by_id(event_id):
        raise HTTPException(status_code=404, detail="Event not found")

    # Update tables
    tables_data = []
    if layout_update.tables is not None:
        tables_data = [t.model_dump() for t in layout_update.tables]
        db.update_layout(event_id, tables_data)
    else:
        tables_data = db.get_layout(event_id)

    # Update config
    current_config = db.get_layout_config(event_id)
    if layout_update.config:
        current_config["config"] = layout_update.config.model_dump()
    if layout_update.floor_plan_url is not None:
        current_config["floor_plan_url"] = layout_update.floor_plan_url
    
    db.update_layout_config(event_id, current_config)

    await sio.emit(
        "layout_changed",
        {
            "event_id": event_id,
            "updated_by": current_user.id,
            "timestamp": datetime.utcnow().isoformat(),
        },
        room=event_id,
    )

    return Layout(
        tables=[Table(**t) for t in tables_data],
        config=layout_update.config or current_config.get("config"),
        floor_plan_url=layout_update.floor_plan_url or current_config.get("floor_plan_url"),
    )


@router.post("/{event_id}/layout/tables", response_model=Table, status_code=201)
async def add_table(
    event_id: str,
    table_create: TableCreate,
    current_user: User = Depends(get_current_admin_user),
):
    if not db.get_event_by_id(event_id):
        raise HTTPException(status_code=404, detail="Event not found")

    tables = db.get_layout(event_id) or []

    seats = generate_seats(
        table_create.num_seats,
        table_create.shape,
        table_create.width,
        table_create.height,
    )

    new_table = {
        "id": str(uuid.uuid4()),
        "shape": table_create.shape,
        "position": table_create.position.model_dump(),
        "rotation": table_create.rotation,
        "width": table_create.width,
        "height": table_create.height,
        "seats": seats,
    }

    tables.append(new_table)
    db.update_layout(event_id, tables)

    await sio.emit(
        "layout_changed",
        {
            "event_id": event_id,
            "updated_by": current_user.id,
            "timestamp": datetime.utcnow().isoformat(),
        },
        room=event_id,
    )

    return Table(**new_table)


@router.put("/{event_id}/layout/tables/{table_id}", response_model=Table)
async def update_table(
    event_id: str,
    table_id: str,
    table_update: TableUpdate,
    current_user: User = Depends(get_current_admin_user)
):
    """Update a table in the layout (Admin only)."""
    # Get current layout
    tables = db.get_layout(event_id)
    
    # Find table
    table_found = False
    for table in tables:
        if table["id"] == table_id:
            table_found = True
            
            # Update fields
            if table_update.position:
                table["position"] = table_update.position.dict()
            if table_update.rotation is not None:
                table["rotation"] = table_update.rotation
            if table_update.width:
                table["width"] = table_update.width
            if table_update.height:
                table["height"] = table_update.height
            
            break
    
    if not table_found:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Table not found"
        )
    
    # Update layout
    db.update_layout(event_id, tables)
    
    # Broadcast layout change
    await sio.emit(
        "layout_changed",
        {
            "event_id": event_id,
            "updated_by": current_user.id,
            "timestamp": datetime.utcnow().isoformat()
        },
        room=event_id
    )
    
    # Return updated table
    updated_table = next(t for t in tables if t["id"] == table_id)
    return Table(**updated_table)


@router.delete("/{event_id}/layout/tables/{table_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_table(
    event_id: str,
    table_id: str,
    current_user: User = Depends(get_current_admin_user)
):
    """Delete a table from the layout (Admin only)."""
    # Get current layout
    tables = db.get_layout(event_id)
    
    # Remove table
    original_length = len(tables)
    tables = [t for t in tables if t["id"] != table_id]
    
    if len(tables) == original_length:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Table not found"
        )
    
    # Unassign guests from this table
    all_guests = db.get_all_guests(event_id)
    guests_to_update = []
    events_to_emit = []
    
    for guest in all_guests:
        if guest.get("table_id") == table_id:
            guests_to_update.append({
                "id": guest["id"],
                "table_id": None,
                "seat_id": None
            })
            
            events_to_emit.append({
                "event_id": event_id,
                "guest_id": guest["id"],
                "table_id": table_id,
                "seat_id": guest.get("seat_id"),
                "unassigned_by": current_user.id,
                "timestamp": datetime.utcnow().isoformat()
            })

    # Bulk update guests
    if guests_to_update:
        db.bulk_update_guests(event_id, guests_to_update)
        
        # Broadcast seat unassignment
        for event_data in events_to_emit:
            await sio.emit("seat_unassigned", event_data, room=event_id)

    # Update layout
    db.update_layout(event_id, tables)
    
    # Broadcast layout change
    await sio.emit(
        "layout_changed",
        {
            "event_id": event_id,
            "updated_by": current_user.id,
            "timestamp": datetime.utcnow().isoformat()
        },
        room=event_id
    )
    
    return None


@router.post("/{event_id}/layout/assign-seat")
async def assign_guest_to_seat(
    event_id: str,
    assignment: SeatAssignment,
    current_user: User = Depends(get_current_admin_user)
):
    """Assign a guest to a specific seat (Admin only)."""
    # Verify guest exists
    guest = db.get_guest_by_id(event_id, assignment.guest_id)
    if not guest:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Guest not found"
        )
    
    # Get current layout
    tables = db.get_layout(event_id)
    
    # Find table and seat
    table_found = False
    seat_found = False
    displaced_guest_id = None
    
    for table in tables:
        if table["id"] == assignment.table_id:
            table_found = True
            
            for seat in table.get("seats", []):
                # Unassign guest from any previous seat in this table
                if seat.get("guest_id") == assignment.guest_id:
                    seat["guest_id"] = None
                    seat["status"] = "unassigned"
                
                # Assign to new seat
                if seat["id"] == assignment.seat_id:
                    seat_found = True
                    # Check if seat is already occupied by someone else
                    if seat.get("guest_id") and seat["guest_id"] != assignment.guest_id:
                        displaced_guest_id = seat["guest_id"]
                    
                    seat["guest_id"] = assignment.guest_id
                    seat["status"] = "assigned"
            
            break
    
    if not table_found:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Table not found"
        )
    
    if not seat_found:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Seat not found"
        )
    
    # Update layout
    db.update_layout(event_id, tables)
    
    # Handle displaced guest (Swap logic)
    if displaced_guest_id:
        db.update_guest(event_id, displaced_guest_id, {
            "table_id": None,
            "seat_id": None
        })
        
        # Broadcast unassignment for displaced guest
        await sio.emit(
            "seat_unassigned",
            {
                "event_id": event_id,
                "guest_id": displaced_guest_id,
                "table_id": assignment.table_id,
                "seat_id": assignment.seat_id,
                "unassigned_by": current_user.id,
                "timestamp": datetime.utcnow().isoformat()
            },
            room=event_id
        )

    # Update guest with seat assignment
    db.update_guest(event_id, assignment.guest_id, {
        "table_id": assignment.table_id,
        "seat_id": assignment.seat_id
    })
    
    # Broadcast seat assignment
    await sio.emit(
        "seat_assigned",
        {
            "event_id": event_id,
            "guest_id": assignment.guest_id,
            "table_id": assignment.table_id,
            "seat_id": assignment.seat_id,
            "guest": guest,
            "assigned_by": current_user.id,
            "timestamp": datetime.utcnow().isoformat()
        },
        room=event_id
    )
    
    return {"message": "Seat assigned successfully"}


@router.post("/{event_id}/layout/unassign-seat")
async def unassign_guest_from_seat(
    event_id: str,
    assignment: SeatAssignment,
    current_user: User = Depends(get_current_admin_user)
):
    """Unassign a guest from their seat (Admin only)."""
    # Get current layout
    tables = db.get_layout(event_id)
    
    # Find and unassign seat
    for table in tables:
        if table["id"] == assignment.table_id:
            for seat in table.get("seats", []):
                if seat["id"] == assignment.seat_id:
                    seat["guest_id"] = None
                    seat["status"] = "unassigned"
                    break
            break
    
    # Update layout
    db.update_layout(event_id, tables)
    
    # Update guest
    db.update_guest(event_id, assignment.guest_id, {
        "table_id": None,
        "seat_id": None
    })
    
    # Broadcast seat unassignment
    await sio.emit(
        "seat_unassigned",
        {
            "event_id": event_id,
            "guest_id": assignment.guest_id,
            "table_id": assignment.table_id,
            "seat_id": assignment.seat_id,
            "unassigned_by": current_user.id,
            "timestamp": datetime.utcnow().isoformat()
        },
        room=event_id
    )
    
    return {"message": "Seat unassigned successfully"}
