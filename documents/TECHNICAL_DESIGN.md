# Technical Design Document: Event Check-in Management System

## Table of Contents
1. [System Architecture](#system-architecture)
2. [Data Flow](#data-flow)
3. [API Design](#api-design)
4. [WebSocket Communication](#websocket-communication)
5. [Data Persistence Strategy](#data-persistence-strategy)
6. [Concurrency Management](#concurrency-management)
7. [Performance Optimizations](#performance-optimizations)
8. [Security Architecture](#security-architecture)

## System Architecture

### Overview
The system follows a **three-tier architecture** with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────┐
│                     Presentation Layer                       │
│  ┌─────────────────┐  ┌──────────────────┐                 │
│  │  Admin Portal   │  │  Staff Portal    │                 │
│  │  (React + Vite) │  │  (React + Vite)  │                 │
│  └────────┬────────┘  └────────┬─────────┘                 │
│           │                     │                            │
│           └──────────┬──────────┘                            │
└──────────────────────┼───────────────────────────────────────┘
                       │
          ┌────────────┴────────────┐
          │   HTTP/HTTPS            │   WebSocket/Socket.IO
          │   REST API              │   Real-time Events
          └────────────┬────────────┘
┌──────────────────────┼───────────────────────────────────────┐
│                Application Layer                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │         FastAPI Application (Python 3.9+)           │    │
│  │  ┌──────────┐  ┌───────────┐  ┌──────────────┐    │    │
│  │  │ API      │  │ Services  │  │ Socket.IO    │    │    │
│  │  │ Routes   │◄─┤ Business  │◄─┤ Event        │    │    │
│  │  │          │  │ Logic     │  │ Handlers     │    │    │
│  │  └────┬─────┘  └─────┬─────┘  └──────┬───────┘    │    │
│  │       │              │                │             │    │
│  │       └──────────────┴────────────────┘             │    │
│  │                      │                               │    │
│  └──────────────────────┼───────────────────────────────┘    │
└─────────────────────────┼────────────────────────────────────┘
                          │
          ┌───────────────┴────────────────┐
          │   Storage Adapter Layer        │
          │   (JSON Database + Cache)      │
          └───────────────┬────────────────┘
┌─────────────────────────┼─────────────────────────────────────┐
│                   Data Layer                                   │
│  ┌─────────────────────────────────────────────────────┐     │
│  │          Hierarchical JSON File Storage             │     │
│  │  ┌────────┐  ┌──────────────────────────────┐     │     │
│  │  │users.json│  │ events/                     │     │     │
│  │  └────────┘  │   ├─ EV001/                  │     │     │
│  │              │   │   ├─ event.json          │     │     │
│  │              │   │   ├─ tables.json         │     │     │
│  │              │   │   └─ guests.json         │     │     │
│  │              │   └─ EV002/                  │     │     │
│  │              │       ├─ event.json          │     │     │
│  │              │       ├─ tables.json         │     │     │
│  │              │       └─ guests.json         │     │     │
│  │              └──────────────────────────────┘     │     │
│  └─────────────────────────────────────────────────────┘     │
└────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

#### Presentation Layer
- **Admin Portal**: Event management, layout design, guest management, reporting
- **Staff Portal**: Real-time check-in/checkout, guest search, layout visualization

#### Application Layer
- **API Routes**: HTTP endpoint handlers
- **Services**: Business logic and validation
- **Socket.IO Handlers**: Real-time event processing

#### Storage Layer
- **JSON Database Adapter**: CRUD operations with caching
- **Cache Manager**: In-memory data cache for performance

#### Data Layer
- **File System**: Hierarchical JSON storage

## Data Flow

### 1. Guest Check-in Flow

```
┌─────────┐         ┌──────────┐         ┌──────────┐         ┌──────────┐
│ Staff   │         │ FastAPI  │         │ JSON DB  │         │ Socket   │
│ Client  │         │ Backend  │         │ Adapter  │         │ Server   │
└────┬────┘         └────┬─────┘         └────┬─────┘         └────┬─────┘
     │                   │                    │                     │
     │ POST /checkin     │                    │                     │
     ├──────────────────►│                    │                     │
     │                   │                    │                     │
     │                   │ update_guest()     │                     │
     │                   ├───────────────────►│                     │
     │                   │                    │                     │
     │                   │  1. Read cache     │                     │
     │                   │  2. Acquire lock   │                     │
     │                   │  3. Write file     │                     │
     │                   │  4. Update cache   │                     │
     │                   │◄───────────────────┤                     │
     │                   │                    │                     │
     │  {guest: {...}}   │                    │                     │
     │◄──────────────────┤                    │                     │
     │                   │                    │                     │
     │                   │ broadcast_checkin()│                     │
     │                   ├───────────────────────────────────────►  │
     │                   │                    │                     │
     │                   │                    │  emit to event room │
     │◄──────────────────┴────────────────────┴────────────────────┤
     │  guest_checked_in event                                      │
     │                                                               │
┌────▼─────┐                                                        │
│ Other    │                                                        │
│ Staff    │◄───────────────────────────────────────────────────────┤
│ Clients  │  guest_checked_in event                                │
└──────────┘                                                        │
```

### 2. Layout Update Flow

```
┌─────────┐         ┌──────────┐         ┌──────────┐
│ Admin   │         │ FastAPI  │         │ JSON DB  │
│ Client  │         │ Backend  │         │ Adapter  │
└────┬────┘         └────┬─────┘         └────┬─────┘
     │                   │                    │
     │ PUT /layout       │                    │
     ├──────────────────►│                    │
     │                   │                    │
     │                   │ update_layout()    │
     │                   ├───────────────────►│
     │                   │                    │
     │                   │  1. Validate data  │
     │                   │  2. Write file     │
     │                   │  3. Update cache   │
     │                   │◄───────────────────┤
     │                   │                    │
     │  {tables: [...]}  │                    │
     │◄──────────────────┤                    │
     │                   │                    │
```

## API Design

### Authentication Endpoints

#### POST /api/auth/login
**Request:**
```json
{
  "email": "admin@example.com",
  "password": "admin123"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

#### GET /api/auth/me
**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "id": "uuid-here",
  "email": "admin@example.com",
  "full_name": "Admin User",
  "role": "admin",
  "is_active": true,
  "created_at": "2025-01-27T10:00:00Z",
  "assigned_events": ["EV001", "EV002"]
}
```

### Event Endpoints

#### POST /api/events
**Request:**
```json
{
  "name": "Annual Conference 2025",
  "date": "2025-06-15T09:00:00Z",
  "location": "Convention Center Hall A",
  "description": "Annual company conference"
}
```

**Response:**
```json
{
  "id": "EV12345678",
  "name": "Annual Conference 2025",
  "date": "2025-06-15T09:00:00Z",
  "location": "Convention Center Hall A",
  "description": "Annual company conference",
  "status": "draft",
  "created_by": "user-uuid",
  "created_at": "2025-01-27T10:00:00Z",
  "updated_at": "2025-01-27T10:00:00Z",
  "floor_plan_url": null
}
```

#### GET /api/events
**Response:**
```json
[
  {
    "id": "EV12345678",
    "name": "Annual Conference 2025",
    "date": "2025-06-15T09:00:00Z",
    "location": "Convention Center Hall A",
    "status": "active",
    "total_guests": 150,
    "checked_in_count": 45,
    "total_seats": 200
  }
]
```

### Layout Endpoints

#### PUT /api/events/{event_id}/layout
**Request:**
```json
{
  "tables": [
    {
      "id": "table-1",
      "shape": "round",
      "position": {"x": 100, "y": 100},
      "rotation": 0,
      "width": 120,
      "height": 120,
      "seats": [
        {
          "id": "seat-1-1",
          "position": {"x": 0, "y": -70},
          "rotation": 0,
          "guest_id": "guest-uuid-1",
          "status": "assigned"
        }
      ]
    }
  ],
  "config": {
    "grid_size": 20,
    "snap_to_grid": true,
    "canvas_width": 2000,
    "canvas_height": 1500,
    "show_grid": true
  }
}
```

### Guest Endpoints

#### POST /api/events/{event_id}/guests
**Request:**
```json
{
  "full_name": "John Doe",
  "phone": "+1234567890",
  "company": "Tech Corp",
  "email": "john@example.com",
  "notes": "VIP guest"
}
```

#### POST /api/events/{event_id}/guests/import
**Request (multipart/form-data):**
```
file: guests.csv
```

**CSV Format:**
```csv
full_name,phone,company,email,notes
John Doe,+1234567890,Tech Corp,john@example.com,VIP
Jane Smith,+9876543210,Design Co,jane@example.com,
```

#### POST /api/events/{event_id}/checkin
**Request:**
```json
{
  "guest_id": "guest-uuid"
}
```

**Response:**
```json
{
  "guest": {
    "id": "guest-uuid",
    "full_name": "John Doe",
    "checked_in": true,
    "checked_in_at": "2025-01-27T14:30:00Z",
    "checked_in_by": "staff-user-uuid"
  },
  "message": "Guest checked in successfully"
}
```

## WebSocket Communication

### Socket.IO Events

#### Client → Server Events

**join_event**
```json
{
  "event_id": "EV12345678",
  "user_id": "user-uuid"
}
```

**checkin**
```json
{
  "event_id": "EV12345678",
  "guest_id": "guest-uuid",
  "user_id": "staff-user-uuid"
}
```

**checkout**
```json
{
  "event_id": "EV12345678",
  "guest_id": "guest-uuid",
  "user_id": "staff-user-uuid"
}
```

#### Server → Client Events

**guest_checked_in**
```json
{
  "guest": {
    "id": "guest-uuid",
    "full_name": "John Doe",
    "checked_in": true,
    "checked_in_at": "2025-01-27T14:30:00Z",
    "table_id": "table-1",
    "seat_id": "seat-1-1"
  },
  "checked_in_by": "staff-user-uuid",
  "timestamp": "2025-01-27T14:30:00Z"
}
```

**guest_checked_out**
```json
{
  "guest": {
    "id": "guest-uuid",
    "checked_in": false
  },
  "checked_out_by": "staff-user-uuid",
  "timestamp": "2025-01-27T14:35:00Z"
}
```

**layout_changed**
```json
{
  "event_id": "EV12345678",
  "updated_by": "admin-user-uuid",
  "timestamp": "2025-01-27T14:40:00Z"
}
```

## Data Persistence Strategy

### Memory-First, Disk-Later Approach

```
┌─────────────────────────────────────────────────────────┐
│                     Read Operation                       │
│                                                           │
│  1. Check in-memory cache                                │
│     ├─ Cache hit → Return immediately                    │
│     └─ Cache miss → Read from disk                       │
│                     └─ Update cache                      │
│                        └─ Return data                    │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                    Write Operation                       │
│                                                           │
│  1. Acquire file lock (pessimistic)                      │
│  2. Read current data from disk                          │
│  3. Apply modifications                                  │
│  4. Write atomically to disk                             │
│  5. Release file lock                                    │
│  6. Update in-memory cache                               │
│  7. Return to caller                                     │
└─────────────────────────────────────────────────────────┘
```

### File Structure

```
data/
├── users.json                      # System users
└── events/
    ├── EV12345678/
    │   ├── event.json              # Event metadata
    │   ├── event.json.lock         # Lock file (auto-created)
    │   ├── tables.json             # Layout data
    │   ├── tables.json.lock
    │   ├── guests.json             # Guest list
    │   └── guests.json.lock
    └── EV87654321/
        ├── event.json
        ├── tables.json
        └── guests.json
```

### Data Schema Examples

**users.json:**
```json
[
  {
    "id": "uuid-1",
    "email": "admin@example.com",
    "hashed_password": "$2b$12$...",
    "full_name": "Admin User",
    "role": "admin",
    "is_active": true,
    "created_at": "2025-01-27T10:00:00Z",
    "updated_at": "2025-01-27T10:00:00Z",
    "assigned_events": ["EV001", "EV002"]
  }
]
```

**event.json:**
```json
{
  "id": "EV12345678",
  "name": "Annual Conference 2025",
  "date": "2025-06-15T09:00:00Z",
  "location": "Convention Center Hall A",
  "description": "Annual company conference",
  "status": "active",
  "created_by": "user-uuid",
  "created_at": "2025-01-27T10:00:00Z",
  "updated_at": "2025-01-27T10:00:00Z",
  "floor_plan_url": "/uploads/floor-plans/ev001.png"
}
```

**tables.json:**
```json
[
  {
    "id": "table-1",
    "shape": "round",
    "position": {"x": 100, "y": 100},
    "rotation": 0,
    "width": 120,
    "height": 120,
    "seats": [
      {
        "id": "seat-1-1",
        "position": {"x": 0, "y": -70},
        "rotation": 0,
        "guest_id": "guest-uuid-1",
        "status": "assigned"
      },
      {
        "id": "seat-1-2",
        "position": {"x": 60, "y": -35},
        "rotation": 60,
        "guest_id": null,
        "status": "unassigned"
      }
    ]
  }
]
```

**guests.json:**
```json
[
  {
    "id": "guest-uuid-1",
    "event_id": "EV12345678",
    "full_name": "John Doe",
    "phone": "+1234567890",
    "company": "Tech Corp",
    "email": "john@example.com",
    "notes": "VIP guest",
    "table_id": "table-1",
    "seat_id": "seat-1-1",
    "checked_in": true,
    "checked_in_at": "2025-01-27T14:30:00Z",
    "checked_in_by": "staff-user-uuid",
    "created_at": "2025-01-27T10:00:00Z",
    "updated_at": "2025-01-27T14:30:00Z"
  }
]
```

## Concurrency Management

### File Locking Strategy

The system uses **pessimistic locking** with the `filelock` library to prevent race conditions:

```python
from filelock import FileLock

def write_json(file_path, data):
    lock_path = f"{file_path}.lock"
    
    with FileLock(lock_path, timeout=10):
        # Critical section - only one process can execute
        with open(file_path, 'w') as f:
            json.dump(data, f, indent=2)
```

### Concurrent Check-in Scenario

```
Time    Staff A                 Staff B                 Database
─────────────────────────────────────────────────────────────────
T0      Check-in Guest 1
        ├─ Acquire lock         
        ├─ Read guests.json                             
T1                              Check-in Guest 2
                                └─ Wait for lock...
T2      └─ Update Guest 1
        └─ Write guests.json
        └─ Release lock                                 ✓ Saved
T3                              ├─ Acquire lock
                                ├─ Read guests.json     (includes Guest 1)
T4                              └─ Update Guest 2
                                └─ Write guests.json
                                └─ Release lock         ✓ Saved
```

### Cache Invalidation

```python
class JSONDatabase:
    def _write_json(self, file_path, data, invalidate_cache=True):
        # Write to disk with lock
        with FileLock(lock_path):
            with open(file_path, 'w') as f:
                json.dump(data, f)
        
        # Update cache immediately after write
        if invalidate_cache:
            with self._cache_lock:
                self._cache[str(file_path)] = data
```

## Performance Optimizations

### 1. In-Memory Caching
- All reads hit cache first
- Cache updates on every write
- Thread-safe cache operations

### 2. Batch Operations
- Bulk guest imports processed in single transaction
- Reduced file I/O operations

### 3. Frontend Optimizations
- Virtual scrolling for large guest lists
- Canvas layer caching in React Konva
- Debounced layout updates

### 4. WebSocket Rooms
- Events scoped by `event_id`
- Targeted broadcasts only to relevant clients
- Reduces network overhead

## Security Architecture

### Authentication
- JWT tokens with 30-minute expiration
- bcrypt password hashing (cost factor 12)
- HTTP-only cookies in production

### Authorization
- Role-based access control (RBAC)
- Super Admin, Admin, Staff roles
- Endpoint-level permission checks

### Data Protection
- HTTPS enforcement in production
- CORS configured for specific origins
- Input validation with Pydantic
- SQL injection not applicable (no database)
- XSS prevention (React auto-escaping)

### API Security
```python
from fastapi import Depends
from app.core.dependencies import get_current_admin_user

@router.post("/events")
async def create_event(
    event_data: EventCreate,
    current_user: User = Depends(get_current_admin_user)
):
    # Only admins can create events
    ...
```

## Deployment Architecture

```
┌──────────────────────────────────────────────────┐
│                 Load Balancer                     │
│                   (nginx)                         │
└──────────────┬───────────────┬───────────────────┘
               │               │
       ┌───────┴──────┐ ┌─────┴────────┐
       │  Frontend    │ │  Backend     │
       │  (Static)    │ │  (FastAPI)   │
       │              │ │              │
       │  CDN/nginx   │ │  uvicorn     │
       └──────────────┘ └──────┬───────┘
                               │
                        ┌──────┴──────┐
                        │  Data Dir   │
                        │  (JSON)     │
                        └─────────────┘
```

## Monitoring & Logging

### Application Logs
- Request/response logging
- Socket.IO connection events
- File lock acquisition/release
- Error tracking

### Performance Metrics
- API response times
- WebSocket message latency
- File I/O duration
- Cache hit/miss ratio

---

*This technical design document provides the foundational architecture for the Event Check-in Management System. For implementation details, refer to the source code documentation.*
