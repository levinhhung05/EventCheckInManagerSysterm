# Event Check-In Manager System - System Design Document

## 1. System Overview

The Event Check-In Manager is a full-stack application designed for managing event guest lists, layouts, and real-time attendance. It distinguishes between **Admin** (management) and **Staff** (operation) roles.

### Tech Stack
- **Frontend**: React (Vite), Chakra UI, React-Konva (for Layout Builder), TanStack Query (State Management).
- **Backend**: Python FastAPI, Socket.IO (Real-time), Pydantic V2.
- **Persistence**: File-based JSON Database with `filelock` for concurrency control.
- **Runtime**: Windows (Primary), Cross-platform compatible.

---

## 2. Architecture & Data Flow

### 2.1 "Memory-First, Disk-Later" Persistence
The system uses a custom JSON-based persistence layer (`json_db.py`) optimized for read-heavy, write-moderate workloads.
- **Reads**: Served from in-memory cache (`lru_cache`).
- **Writes**: Protected by pessimistic file locking (`.lock` files) to ensure ACID-like properties on the file system.
- **Directory Structure**:
  ```text
  backend/data/
  ├── users.json          # Admin/Staff credentials & assignments
  └── events/
      └── {event_id}/
          ├── event.json       # Metadata (name, dates, status)
          ├── guests.json      # Guest list with timestamps
          ├── tables.json      # Layout configuration (tables, seats)
          └── layout_config.json # Visual settings (background, assets)
  ```

### 2.2 Real-Time Event Propagation
Socket.IO is used to broadcast state changes immediately to all connected clients (Admin Dashboard, Staff Check-in Devices).

**Flow: Guest Check-In/Out**
1. **Client** sends `POST /api/events/{id}/guests/checkin` (or checkout).
2. **Backend** acquires lock on `guests.json`.
3. **Backend** updates record:
   - *Check-in*: Sets `checked_in=True`, `checked_in_at=Timestamp`.
   - *Check-out*: Sets `checked_in=False`, `checked_out_at=Timestamp`.
4. **Backend** releases lock.
5. **Socket.IO** emits `guest_updated` event to room `event_{id}`.
6. **Clients** receive event and update UI optimistically or via refetch.

---

## 3. Key Modules & Features

### 3.1 Guest Management (Check-in/Out)
Recently enhanced to support full lifecycle tracking.

**Data Model (`GuestInDB`)**:
```python
class GuestInDB(BaseModel):
    id: str
    full_name: str
    status: str
    checked_in: bool
    checked_in_at: Optional[datetime]
    checked_out_at: Optional[datetime]  # New field
    # ... other fields
```

**Logic**:
- **Check-in**: Updates `checked_in_at`.
- **Check-out**: Updates `checked_out_at`. *Note: Does not wipe check-in time, preserving history.*

### 3.2 Layout Builder
A canvas-based editor using `react-konva`.
- **Features**: Drag-and-drop tables, seat assignment, background image upload.
- **Mobile Support**: Added white background layer with optimized opacity (0.8) for better visibility on mobile devices.
- **Export**: High-resolution PNG export for floor plans.

### 3.3 Reporting & Analytics
Provides real-time insights into event attendance.
- **Timeline**: Unified stream of Check-in AND Check-out events, sorted chronologically.
- **Stats**: Real-time counts for `Checked In`, `Checked Out`, `Pending`.

---

## 4. API Design (Key Endpoints)

### Guests
- `GET /api/events/{id}/guests`: List all guests.
- `POST /api/events/{id}/guests/checkin`: Check in a guest.
- `POST /api/events/{id}/guests/checkout`: Check out a guest.
  - **Payload**: `{ "guest_id": "...", "timestamp": "..." }`

### Reports
- `GET /api/events/{id}/reports/attendance`: Returns stats and timeline.
  - **Response Structure**:
    ```json
    {
      "total_guests": 100,
      "checked_in_count": 45,
      "checked_out_count": 5,
      "timeline": [
        { "type": "check_in", "timestamp": "...", "guest": "..." },
        { "type": "check_out", "timestamp": "...", "guest": "..." }
      ]
    }
    ```

---

## 5. Security & Roles
- **Admin**: Full access to Layout Builder, Guest Management, Reports.
- **Staff**: Restricted access to Check-in/Check-out interface only.
- **Auth**: JWT-based authentication with role scopes.
