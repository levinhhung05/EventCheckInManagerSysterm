"""
Reporting API endpoints.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from typing import Dict, Any
import io
import csv
from datetime import datetime
import pandas as pd
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet

from app.models import User
from app.core.dependencies import get_current_admin_user, get_current_active_user
from app.storage.json_db import db

router = APIRouter()


@router.get("/{event_id}/reports/attendance")
async def get_attendance_report(
    event_id: str,
    current_user: User = Depends(get_current_active_user)
) -> Dict[str, Any]:
    """
    Get attendance summary report for an event.
    
    Returns statistics and lists of checked-in and not-checked-in guests.
    """
    # Verify event exists
    event = db.get_event_by_id(event_id)
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found"
        )
    
    # Get all guests
    guests = db.get_all_guests(event_id)
    
    # Calculate statistics
    total_guests = len(guests)
    
    # 1. Currently Checked In
    checked_in_guests = [g for g in guests if g.get("checked_in", False)]
    
    # 2. Currently Not Checked In (could be Pending or Checked Out)
    inactive_guests = [g for g in guests if not g.get("checked_in", False)]
    
    # 3. Checked Out (Not checked in + has checked_out_at)
    checked_out_guests = [g for g in inactive_guests if g.get("checked_out_at")]
    
    # 4. Pending (Not checked in + no checked_out_at)
    pending_guests = [g for g in inactive_guests if not g.get("checked_out_at")]
    
    checked_in_count = len(checked_in_guests)
    checked_out_count = len(checked_out_guests)
    pending_count = len(pending_guests)
    not_checked_in_count = len(inactive_guests) # Keep for backward compatibility if needed
    
    percentage = (checked_in_count / total_guests * 100) if total_guests > 0 else 0
    
    # Get layout statistics
    tables = db.get_layout(event_id)
    total_tables = len(tables)
    total_seats = sum(len(t.get("seats", [])) for t in tables)
    assigned_seats = sum(
        1 for t in tables
        for s in t.get("seats", [])
        if s.get("guest_id")
    )
    
    # Activity timeline (Check-ins and Check-outs)
    timeline = []
    
    # Add check-ins (for all guests who have ever checked in)
    for guest in guests:
        if guest.get("checked_in_at"):
            timeline.append({
                "type": "check_in",
                "guest_name": guest.get("full_name"),
                "guest_id": guest.get("id"),
                "timestamp": guest.get("checked_in_at"),
                "by": guest.get("checked_in_by")
            })

    # Add check-outs
    for guest in guests:
        if guest.get("checked_out_at"):
            timeline.append({
                "type": "check_out",
                "guest_name": guest.get("full_name"),
                "guest_id": guest.get("id"),
                "timestamp": guest.get("checked_out_at"),
                "by": None
            })
            
    # Sort by timestamp descending
    timeline.sort(key=lambda x: x["timestamp"] or "", reverse=True)
    
    return {
        "event_id": event_id,
        "event_name": event.get("name"),
        "event_date": event.get("date"),
        "event_location": event.get("location"),
        "generated_at": datetime.utcnow().isoformat(),
        
        # Guest statistics
        "total_guests": total_guests,
        "checked_in_count": checked_in_count,
        "checked_out_count": checked_out_count,
        "pending_count": pending_count,
        "not_checked_in_count": pending_count, # Updated to show only pending
        "attendance_percentage": round(percentage, 2),
        
        # Layout statistics
        "total_tables": total_tables,
        "total_seats": total_seats,
        "assigned_seats": assigned_seats,
        "unassigned_seats": total_seats - assigned_seats,
        "seat_utilization_percentage": round(
            (assigned_seats / total_seats * 100) if total_seats > 0 else 0,
            2
        ),
        
        # Guest lists (limited to first 100 for performance)
        "checked_in_guests": [
            {
                "id": g.get("id"),
                "full_name": g.get("full_name"),
                "checked_in_at": g.get("checked_in_at")
            } for g in checked_in_guests[:100]
        ],
        "not_checked_in_guests": [
            {
                "id": g.get("id"),
                "full_name": g.get("full_name")
            } for g in pending_guests[:100]
        ],
        "timeline": timeline,
        "check_in_timeline": timeline # Backward compatibility
    }

@router.get("/{event_id}/reports/export/excel")
async def export_attendance_excel(
    event_id: str,
    current_user: User = Depends(get_current_admin_user)
):
    """Export attendance report to Excel."""
    event = db.get_event_by_id(event_id)
    if not event:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Event not found")

    guests = db.get_all_guests(event_id)
    
    # Prepare data for DataFrame
    data = []
    for g in guests:
        data.append({
            "Name": g.get("full_name", ""),
            "Email": g.get("email", ""),
            "Phone": g.get("phone", ""),
            "Status": "Checked In" if g.get("checked_in") else "Not Checked In",
            "Check-in Time": g.get("checked_in_at", ""),
            "Checked-in By": g.get("checked_in_by", ""),
            "Table": g.get("table_id", ""),
            "Seat": g.get("seat_id", "")
        })
    
    df = pd.DataFrame(data)
    
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, index=False, sheet_name='Attendance')
    
    output.seek(0)
    
    filename = f"attendance_report_{event_id}_{datetime.now().strftime('%Y%m%d%H%M%S')}.xlsx"
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@router.get("/{event_id}/reports/export/pdf")
async def export_attendance_pdf(
    event_id: str,
    current_user: User = Depends(get_current_admin_user)
):
    """Export attendance report to PDF."""
    event = db.get_event_by_id(event_id)
    if not event:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Event not found")

    guests = db.get_all_guests(event_id)
    checked_in_guests = [g for g in guests if g.get("checked_in")]
    not_checked_in_guests = [g for g in guests if not g.get("checked_in")]
    
    # Create PDF
    output = io.BytesIO()
    doc = SimpleDocTemplate(output, pagesize=letter)
    elements = []
    styles = getSampleStyleSheet()
    
    # Title
    elements.append(Paragraph(f"Attendance Report: {event.get('name')}", styles['Title']))
    elements.append(Spacer(1, 12))
    
    # Summary Stats
    summary_data = [
        ["Metric", "Count"],
        ["Total Guests", str(len(guests))],
        ["Checked In", str(len(checked_in_guests))],
        ["Not Checked In", str(len(not_checked_in_guests))],
        ["Attendance %", f"{(len(checked_in_guests)/len(guests)*100):.1f}%" if guests else "0%"]
    ]
    t = Table(summary_data)
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (1, 0), colors.grey),
        ('TEXTCOLOR', (0, 0), (1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
        ('GRID', (0, 0), (-1, -1), 1, colors.black)
    ]))
    elements.append(t)
    elements.append(Spacer(1, 24))
    
    # Guest List
    elements.append(Paragraph("Guest Details", styles['Heading2']))
    guest_data = [["Name", "Status", "Check-in Time"]]
    for g in guests:
        status_str = "Checked In" if g.get("checked_in") else "Pending"
        time_str = g.get("checked_in_at", "")[:19].replace('T', ' ') if g.get("checked_in_at") else "-"
        guest_data.append([g.get("full_name", ""), status_str, time_str])
        
    t2 = Table(guest_data, repeatRows=1)
    t2.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
    ]))
    elements.append(t2)
    
    doc.build(elements)
    output.seek(0)
    
    filename = f"attendance_report_{event_id}_{datetime.now().strftime('%Y%m%d%H%M%S')}.pdf"
    return StreamingResponse(
        output,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
