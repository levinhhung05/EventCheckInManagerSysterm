"""
Guest management and check-in API endpoints.
"""
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from fastapi.responses import StreamingResponse
from typing import List, Optional
import io
import csv
from datetime import datetime

from app.models import (
    Guest,
    GuestCreate,
    GuestUpdate,
    CheckInRequest,
    CheckInResponse,
    User,
)
from app.core.dependencies import (
    get_current_active_user,
    get_current_admin_user,
)
from app.storage.json_db import db
from app.socket.manager import sio

router = APIRouter()


# =========================
# Guests CRUD
# =========================

@router.get("/{event_id}/guests", response_model=List[Guest])
async def list_guests(
    event_id: str,
    search: Optional[str] = None,
    checked_in: Optional[bool] = None,
    current_user: User = Depends(get_current_active_user),
):
    event = db.get_event_by_id(event_id)
    if not event:
        raise HTTPException(404, "Event not found")

    if current_user.role == "staff" and event_id not in current_user.assigned_events:
        raise HTTPException(403, "Not authorized")

    guests = db.get_all_guests(event_id)

    if search:
        s = search.lower()
        guests = [
            g for g in guests
            if s in g.get("full_name", "").lower()
            or s in g.get("phone", "")
        ]

    if checked_in is not None:
        guests = [g for g in guests if g.get("checked_in") == checked_in]

    return guests


@router.post(
    "/{event_id}/guests",
    response_model=Guest,
    status_code=status.HTTP_201_CREATED,
)
async def create_guest(
    event_id: str,
    payload: GuestCreate,
    current_user: User = Depends(get_current_admin_user),
):
    if not db.get_event_by_id(event_id):
        raise HTTPException(404, "Event not found")

    existing = db.get_all_guests(event_id)
    if any(g.get("phone") == payload.phone for g in existing):
        raise HTTPException(400, "Phone number already exists")

    guest_data = payload.model_dump()
    guest_data.update({
        "table_id": None,
        "seat_id": None,
        "checked_in": False,
        "checked_in_at": None,
        "checked_in_by": None,
    })

    return db.create_guest(event_id, guest_data)


@router.get("/{event_id}/guests/{guest_id}", response_model=Guest)
async def get_guest(
    event_id: str,
    guest_id: str,
    current_user: User = Depends(get_current_active_user),
):
    guest = db.get_guest_by_id(event_id, guest_id)
    if not guest:
        raise HTTPException(404, "Guest not found")
    return guest


@router.put("/{event_id}/guests/{guest_id}", response_model=Guest)
async def update_guest(
    event_id: str,
    guest_id: str,
    payload: GuestUpdate,
    current_user: User = Depends(get_current_admin_user),
):
    guest = db.get_guest_by_id(event_id, guest_id)
    if not guest:
        raise HTTPException(404, "Guest not found")

    if payload.phone and payload.phone != guest.get("phone"):
        if any(
            g.get("phone") == payload.phone and g["id"] != guest_id
            for g in db.get_all_guests(event_id)
        ):
            raise HTTPException(400, "Phone number already exists")

    update_data = payload.model_dump(exclude_unset=True)
    updated_guest = db.update_guest(event_id, guest_id, update_data)
    
    # Broadcast guest update
    await sio.emit(
        "guest_updated",
        {
            "event_id": event_id,
            "guest": updated_guest,
            "updated_by": current_user.id,
            "timestamp": datetime.utcnow().isoformat(),
        },
        room=event_id,
    )
    
    return updated_guest


@router.delete(
    "/{event_id}/guests/{guest_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_guest(
    event_id: str,
    guest_id: str,
    current_user: User = Depends(get_current_admin_user),
):
    if not db.delete_guest(event_id, guest_id):
        raise HTTPException(404, "Guest not found")

    # Broadcast guest deletion
    await sio.emit(
        "guest_deleted",
        {
            "event_id": event_id,
            "guest_id": guest_id,
            "deleted_by": current_user.id,
            "timestamp": datetime.utcnow().isoformat(),
        },
        room=event_id,
    )


# =========================
# Import / Export
# =========================

@router.post("/{event_id}/guests/import")
async def import_guests(
    event_id: str,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_admin_user),
):
    if not db.get_event_by_id(event_id):
        raise HTTPException(404, "Event not found")

    content = await file.read()
    
    # Try different encodings
    text = None
    for encoding in ["utf-8-sig", "utf-8", "latin-1", "cp1252"]:
        try:
            text = content.decode(encoding)
            break
        except UnicodeDecodeError:
            continue
            
    if text is None:
        raise HTTPException(400, "Unable to decode file. Please ensure it is a valid CSV file.")

    # Parse CSV
    try:
        # Use StringIO to handle universal newlines
        f = io.StringIO(text, newline=None)
        
        # Check for headers
        sniffer = csv.Sniffer()
        has_header = sniffer.has_header(text[:1024])
        f.seek(0)
        
        if has_header:
            reader = csv.DictReader(f)
            # Normalize headers (strip whitespace, lowercase)
            if reader.fieldnames:
                reader.fieldnames = [name.strip().lower() if name else "" for name in reader.fieldnames]
        else:
            # Assume default column order if no headers
            reader = csv.DictReader(f, fieldnames=["full_name", "phone", "email", "company", "notes"])

        existing_phones = {g.get("phone") for g in db.get_all_guests(event_id)}
        guests, errors = [], []

        for row_num, row in enumerate(reader, start=2 if has_header else 1):
            # Handle potential None values in row
            if not row:
                continue
                
            # Map various common header names to our internal names
            full_name = (row.get("full_name") or row.get("name") or row.get("guest name") or "").strip()
            phone = (row.get("phone") or row.get("phone number") or row.get("mobile") or "").strip()
            
            if not full_name or not phone:
                # If both are empty, it might be an empty row
                if not any(row.values()):
                    continue
                errors.append(f"Row {row_num}: Missing full_name or phone")
                continue

            if phone in existing_phones:
                errors.append(f"Row {row_num}: Duplicate phone {phone}")
                continue

            guests.append({
                "full_name": full_name,
                "phone": phone,
                "company": (row.get("company") or row.get("organization") or "").strip() or None,
                "email": (row.get("email") or row.get("email address") or "").strip() or None,
                "notes": (row.get("notes") or row.get("comments") or "").strip() or None,
                "table_id": None,
                "seat_id": None,
                "checked_in": False,
                "checked_in_at": None,
                "checked_out_at": None,
                "checked_in_by": None,
            })

            existing_phones.add(phone)

        if guests:
            db.bulk_create_guests(event_id, guests)

        return {"success": len(guests), "failed": len(errors), "errors": errors}

    except csv.Error as e:
        raise HTTPException(400, f"CSV parsing error: {str(e)}")
    except Exception as e:
        print(f"Import error: {str(e)}")
        raise HTTPException(500, f"Import failed: {str(e)}")


@router.get("/{event_id}/guests/export")
async def export_guests(
    event_id: str,
    current_user: User = Depends(get_current_admin_user),
):
    guests = db.get_all_guests(event_id)

    output = io.StringIO()
    writer = csv.DictWriter(
        output,
        fieldnames=[
            "full_name", "phone", "company", "email",
            "notes", "table_id", "seat_id",
            "checked_in", "checked_in_at", "checked_out_at",
        ],
        extrasaction='ignore'
    )

    writer.writeheader()
    for g in guests:
        writer.writerow(g)

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename=guests_{event_id}.csv"
        },
    )


# =========================
# Check-in / Check-out
# =========================

@router.post("/{event_id}/checkin", response_model=CheckInResponse)
async def check_in_guest(
    event_id: str,
    payload: CheckInRequest,
    current_user: User = Depends(get_current_active_user),
):
    guest = db.get_guest_by_id(event_id, payload.guest_id)
    if not guest:
        raise HTTPException(404, "Guest not found")

    if guest.get("checked_in"):
        raise HTTPException(400, "Guest already checked in")

    updated = db.update_guest(
        event_id,
        payload.guest_id,
        {
            "checked_in": True,
            "checked_in_at": datetime.utcnow().isoformat(),
            "checked_in_by": current_user.id,
        },
    )

    await sio.emit(
        "guest_checked_in",
        {"guest": updated, "timestamp": datetime.utcnow().isoformat()},
        room=event_id,
    )

    return {"guest": updated, "message": "Guest checked in successfully"}


@router.post("/{event_id}/checkout", response_model=CheckInResponse)
async def check_out_guest(
    event_id: str,
    payload: CheckInRequest,
    current_user: User = Depends(get_current_active_user),
):
    guest = db.get_guest_by_id(event_id, payload.guest_id)
    if not guest:
        raise HTTPException(404, "Guest not found")

    if not guest.get("checked_in"):
        raise HTTPException(400, "Guest is not checked in")

    updated = db.update_guest(
        event_id,
        payload.guest_id,
        {
            "checked_in": False,
            "checked_out_at": datetime.utcnow().isoformat(),
        },
    )

    print(f"Emitting guest_checked_out to room {event_id}")
    await sio.emit(
        "guest_checked_out",
        {"guest": updated, "timestamp": datetime.utcnow().isoformat()},
        room=event_id,
    )

    return {"guest": updated, "message": "Guest checked out successfully"}
