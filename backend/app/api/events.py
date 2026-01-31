"""
Event management API endpoints.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Dict, Any
from datetime import datetime

from app.models import (
    Event,
    EventCreate,
    EventUpdate,
    EventSummary,
    EventDuplicateRequest,
    EventStaffAssignment,
    User,
)
from app.core.dependencies import (
    get_current_admin_user,
    get_current_active_user,
)
from app.storage.json_db import db

router = APIRouter()


# ------------------------------------------------------------------
# Helpers
# ------------------------------------------------------------------

def normalize_event(event: Dict[str, Any]) -> Dict[str, Any]:
    """
    Convert ISO datetime strings from DB into datetime objects
    for API response models.
    """
    event = event.copy()
    for key in ("date", "created_at", "updated_at"):
        val = event.get(key)
        if val is not None:
            dt = None
            if isinstance(val, str):
                dt = datetime.fromisoformat(val)
            elif isinstance(val, datetime):
                dt = val
            
            if dt is not None:
                # Ensure naive datetime for comparison consistency
                if dt.tzinfo is not None:
                    dt = dt.replace(tzinfo=None)
                event[key] = dt
    return event


# ------------------------------------------------------------------
# Event APIs
# ------------------------------------------------------------------

@router.get("", response_model=List[EventSummary])
async def list_events(
    current_user: User = Depends(get_current_active_user),
):
    events_data = db.get_all_events()
    summaries: List[EventSummary] = []

    for event_data in events_data:
        if current_user.role == "staff":
            if event_data["id"] not in current_user.assigned_events:
                continue

        guests = db.get_all_guests(event_data["id"])
        tables = db.get_layout(event_data["id"])

        total_guests = len(guests)
        checked_in_count = sum(1 for g in guests if g.get("checked_in") is True)
        checked_out_count = sum(1 for g in guests if g.get("checked_in") is False and g.get("checked_out_at") is not None)
        total_seats = sum(len(t.get("seats", [])) for t in tables)

        event = normalize_event(event_data)

        summaries.append(
            EventSummary(
                id=event["id"],
                name=event["name"],
                date=event["date"],
                location=event["location"],
                status=event.get("status"),
                total_guests=total_guests,
                checked_in_count=checked_in_count,
                checked_out_count=checked_out_count,
                total_seats=total_seats,
            )
        )

    summaries.sort(key=lambda e: e.date, reverse=True)
    return summaries


@router.post("", response_model=Event, status_code=status.HTTP_201_CREATED)
async def create_event(
    event_create: EventCreate,
    current_user: User = Depends(get_current_admin_user),
):
    try:
        print(f"DEBUG: creating event with data: {event_create}")
        event_data = event_create.model_dump()
        event_data.update(
            {
                "created_by": current_user.id,
                "status": "draft",
            }
        )

        print("DEBUG: calling db.create_event")
        created_event = db.create_event(event_data)
        print(f"DEBUG: db.create_event returned: {created_event}")
        
        normalized = normalize_event(created_event)
        print(f"DEBUG: normalized event: {normalized}")
        
        return Event(**normalized)
    except Exception as e:
                import traceback
                error_msg = traceback.format_exc()
                print(error_msg)
                with open("error_log.txt", "w") as f:
                    f.write(error_msg)
                raise e


@router.get("/{event_id}", response_model=Event)
async def get_event(
    event_id: str,
    current_user: User = Depends(get_current_active_user),
):
    event_data = db.get_event_by_id(event_id)
    if not event_data:
        raise HTTPException(status_code=404, detail="Event not found")

    if current_user.role == "staff" and event_id not in current_user.assigned_events:
        raise HTTPException(status_code=403, detail="Not authorized")

    return Event(**normalize_event(event_data))


@router.put("/{event_id}", response_model=Event)
async def update_event(
    event_id: str,
    event_update: EventUpdate,
    current_user: User = Depends(get_current_admin_user),
):
    event_data = db.get_event_by_id(event_id)
    if not event_data:
        raise HTTPException(status_code=404, detail="Event not found")

    update_data = event_update.model_dump(exclude_unset=True)
    updated_event = db.update_event(event_id, update_data)

    if not updated_event:
        raise HTTPException(status_code=404, detail="Event not found")

    return Event(**normalize_event(updated_event))


@router.post("/{event_id}/duplicate", response_model=Event)
async def duplicate_event(
    event_id: str,
    request: EventDuplicateRequest,
    current_user: User = Depends(get_current_admin_user),
):
    """
    Duplicate an event with its layout and optionally guests.
    """
    event_data = db.get_event_by_id(event_id)
    if not event_data:
        raise HTTPException(status_code=404, detail="Event not found")

    new_event = db.duplicate_event(
        event_id,
        request.new_name,
        request.new_date,
        request.copy_layout,
        request.copy_guests,
    )

    if not new_event:
        raise HTTPException(status_code=500, detail="Failed to duplicate event")

    return Event(**normalize_event(new_event))


@router.delete("/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_event(
    event_id: str,
    current_user: User = Depends(get_current_admin_user),
):
    if not db.delete_event(event_id):
        raise HTTPException(status_code=404, detail="Event not found")
    return None


@router.get("/{event_id}/staff", response_model=List[User])
async def list_event_staff(
    event_id: str,
    current_user: User = Depends(get_current_admin_user),
):
    """
    List all staff users and their assignment status for this event.
    Actually returns all staff users, the frontend can check assigned_events.
    """
    # Verify event exists
    if not db.get_event_by_id(event_id):
        raise HTTPException(status_code=404, detail="Event not found")

    users = db.get_all_users()
    staff_users = [
        User(**u) for u in users 
        if u.get("role") == "staff" and u.get("is_active")
    ]
    return staff_users


@router.post("/{event_id}/staff")
async def assign_staff_to_event(
    event_id: str,
    assignment: EventStaffAssignment,
    current_user: User = Depends(get_current_admin_user),
):
    """
    Assign or unassign a staff member to an event.
    """
    # Verify event exists
    if not db.get_event_by_id(event_id):
        raise HTTPException(status_code=404, detail="Event not found")

    # Get user
    user = db.get_user_by_id(assignment.user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.get("role") != "staff":
        raise HTTPException(status_code=400, detail="User is not a staff member")

    # Update assigned_events
    assigned_events = set(user.get("assigned_events", []))
    
    if assignment.assigned:
        assigned_events.add(event_id)
    else:
        assigned_events.discard(event_id)
        
    user["assigned_events"] = list(assigned_events)
    
    # Save user
    updated_user = db.update_user(user["id"], {"assigned_events": user["assigned_events"]})
    if not updated_user:
         raise HTTPException(status_code=500, detail="Failed to update user")

    return {"message": "Staff assignment updated successfully"}
