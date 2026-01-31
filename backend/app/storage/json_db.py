"""
JSON-based database adapter with file locking and in-memory caching.
Implements a "Memory-First, Disk-Later" strategy for high performance.
Windows-safe (atomic write + file lock).
"""
import json
import uuid
from pathlib import Path
from typing import Dict, List, Optional, Any, TypeVar
from datetime import datetime
from threading import Lock as ThreadLock

from filelock import FileLock
from app.config import settings

T = TypeVar("T")


class JSONDatabase:
    """
    High-performance JSON file-based database with caching and locking.

    Features:
    - In-memory cache for fast reads
    - Pessimistic file locking for writes
    - Atomic file writes (Windows-safe)
    - Thread-safe operations
    """

    def __init__(self, base_path: Optional[Path] = None):
        self.base_path: Path = (base_path or settings.DATA_DIR).resolve()
        self.base_path.mkdir(parents=True, exist_ok=True)

        # In-memory cache: {file_path: data}
        self._cache: Dict[str, Any] = {}
        self._cache_lock = ThreadLock()

        # Initialize base structure
        self._initialize_data()

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _initialize_data(self):
        """Initialize default data files if they don't exist."""
        users_file = self.base_path / "users.json"

        if not users_file.exists():
            from app.core.security import get_password_hash

            default_admin = {
                "id": str(uuid.uuid4()),
                "email": "admin@example.com",
                "hashed_password": get_password_hash("admin123"),
                "full_name": "Super Admin",
                "role": "super_admin",
                "is_active": True,
                "created_at": datetime.utcnow().isoformat(),
                "updated_at": datetime.utcnow().isoformat(),
                "assigned_events": [],
            }
            self._write_json(users_file, [default_admin])

        (self.base_path / "events").mkdir(exist_ok=True)

    def _get_lock_path(self, file_path: Path) -> Path:
        """Return lock file path (file.json.lock)."""
        return file_path.parent / f"{file_path.name}.lock"

    def _read_json(self, file_path: Path, use_cache: bool = True) -> Any:
        """Read JSON with optional cache."""
        key = str(file_path)

        if use_cache:
            with self._cache_lock:
                if key in self._cache:
                    return self._cache[key]

        if not file_path.exists():
            return None

        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        if use_cache:
            with self._cache_lock:
                self._cache[key] = data

        return data

    def _write_json(self, file_path: Path, data: Any, invalidate_cache: bool = True):
        """
        Atomic, locked write (Windows-safe).
        """
        file_path.parent.mkdir(parents=True, exist_ok=True)
        lock_path = self._get_lock_path(file_path)

        with FileLock(lock_path, timeout=settings.FILE_LOCK_TIMEOUT):
            temp_path = file_path.with_suffix(".tmp")
            with open(temp_path, "w", encoding="utf-8") as f:
                json.dump(
                    data,
                    f,
                    indent=2,
                    ensure_ascii=False,
                    default=str,
                )

            # Atomic replace (safe on Windows)
            temp_path.replace(file_path)

        if invalidate_cache:
            with self._cache_lock:
                self._cache[str(file_path)] = data

    def invalidate_cache(self, file_path: Optional[Path] = None):
        """Invalidate cache for a file or all."""
        with self._cache_lock:
            if file_path:
                self._cache.pop(str(file_path), None)
            else:
                self._cache.clear()

    # ------------------------------------------------------------------
    # User operations
    # ------------------------------------------------------------------

    def get_all_users(self) -> List[Dict]:
        return self._read_json(self.base_path / "users.json") or []

    def get_user_by_id(self, user_id: str) -> Optional[Dict]:
        return next((u for u in self.get_all_users() if u["id"] == user_id), None)

    def get_user_by_email(self, email: str) -> Optional[Dict]:
        return next((u for u in self.get_all_users() if u["email"] == email), None)

    def create_user(self, user_data: Dict) -> Dict:
        users = self.get_all_users()
        user_data.update(
            {
                "id": str(uuid.uuid4()),
                "created_at": datetime.utcnow().isoformat(),
                "updated_at": datetime.utcnow().isoformat(),
            }
        )
        users.append(user_data)
        self._write_json(self.base_path / "users.json", users)
        return user_data

    def update_user(self, user_id: str, update_data: Dict) -> Optional[Dict]:
        users = self.get_all_users()
        user = next((u for u in users if u["id"] == user_id), None)
        if not user:
            return None

        user.update(update_data)
        user["updated_at"] = datetime.utcnow().isoformat()
        self._write_json(self.base_path / "users.json", users)
        return user

    def delete_user(self, user_id: str) -> bool:
        users = self.get_all_users()
        new_users = [u for u in users if u["id"] != user_id]
        if len(new_users) == len(users):
            return False

        self._write_json(self.base_path / "users.json", new_users)
        return True

    # ------------------------------------------------------------------
    # Event operations
    # ------------------------------------------------------------------

    def get_all_events(self) -> List[Dict]:
        events = []
        for event_dir in (self.base_path / "events").iterdir():
            if event_dir.is_dir():
                event = self._read_json(event_dir / "event.json")
                if event:
                    events.append(event)
        return events

    def get_event_by_id(self, event_id: str) -> Optional[Dict]:
        return self._read_json(self.base_path / "events" / event_id / "event.json")

    def create_event(self, event_data: Dict) -> Dict:
        event_id = f"EV{str(uuid.uuid4())[:8].upper()}"
        
        # Serialize datetimes to strings to ensure cache consistency with disk
        for k, v in event_data.items():
            if isinstance(v, datetime):
                event_data[k] = v.isoformat()

        event_data.update(
            {
                "id": event_id,
                "created_at": datetime.utcnow().isoformat(),
                "updated_at": datetime.utcnow().isoformat(),
            }
        )

        event_dir = self.base_path / "events" / event_id
        event_dir.mkdir(parents=True, exist_ok=True)

        self._write_json(event_dir / "event.json", event_data)
        self._write_json(event_dir / "tables.json", [])
        self._write_json(event_dir / "guests.json", [])

        return event_data

    def update_event(self, event_id: str, update_data: Dict) -> Optional[Dict]:
        file = self.base_path / "events" / event_id / "event.json"
        event = self._read_json(file)
        if not event:
            return None

        # Serialize datetimes in update_data
        for k, v in update_data.items():
            if isinstance(v, datetime):
                update_data[k] = v.isoformat()

        event.update(update_data)
        event["updated_at"] = datetime.utcnow().isoformat()
        self._write_json(file, event)
        return event

    def delete_event(self, event_id: str) -> bool:
        event_dir = self.base_path / "events" / event_id
        if not event_dir.exists():
            return False

        for f in event_dir.iterdir():
            if f.is_file():
                f.unlink()
        event_dir.rmdir()
        self.invalidate_cache()
        return True

    def duplicate_event(
        self,
        source_event_id: str,
        new_name: str,
        new_date: datetime,
        copy_layout: bool = True,
        copy_guests: bool = False,
    ) -> Optional[Dict]:
        """
        Duplicate an existing event.
        """
        source_event = self.get_event_by_id(source_event_id)
        if not source_event:
            return None

        # Create new event structure
        new_event_data = source_event.copy()
        new_event_data.update({
            "name": new_name,
            "date": new_date.isoformat() if isinstance(new_date, datetime) else new_date,
            "status": "draft",  # Default to draft for duplicated events
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
        })
        
        # Remove ID to let create_event generate a new one
        if "id" in new_event_data:
            del new_event_data["id"]

        # Use create_event to set up directory and basic files
        created_event = self.create_event(new_event_data)
        new_event_id = created_event["id"]
        new_event_dir = self.base_path / "events" / new_event_id

        # Copy Layout
        if copy_layout:
            source_layout = self.get_layout(source_event_id)
            if source_layout:
                self._write_json(new_event_dir / "tables.json", source_layout)
            
            source_config = self.get_layout_config(source_event_id)
            if source_config:
                self._write_json(new_event_dir / "layout_config.json", source_config)

        # Copy Guests
        if copy_guests:
            source_guests = self.get_all_guests(source_event_id)
            new_guests = []
            for guest in source_guests:
                new_guest = guest.copy()
                new_guest["id"] = str(uuid.uuid4())
                new_guest["event_id"] = new_event_id
                new_guest["checked_in"] = False
                new_guest["checked_in_at"] = None
                new_guest["checked_out_at"] = None
                new_guest["created_at"] = datetime.utcnow().isoformat()
                new_guest["updated_at"] = datetime.utcnow().isoformat()
                
                # If layout was NOT copied, clear seat assignments
                if not copy_layout:
                    new_guest["table_id"] = None
                    new_guest["seat_id"] = None
                
                new_guests.append(new_guest)
            
            self._write_json(new_event_dir / "guests.json", new_guests)

        return created_event

    # ------------------------------------------------------------------
    # Layout operations
    # ------------------------------------------------------------------

    def get_layout(self, event_id: str) -> List[Dict]:
        return self._read_json(self.base_path / "events" / event_id / "tables.json") or []

    def update_layout(self, event_id: str, tables: List[Dict]) -> List[Dict]:
        self._write_json(self.base_path / "events" / event_id / "tables.json", tables)
        return tables

    def get_layout_config(self, event_id: str) -> Dict:
        return self._read_json(self.base_path / "events" / event_id / "layout_config.json") or {}

    def update_layout_config(self, event_id: str, config_data: Dict) -> Dict:
        self._write_json(self.base_path / "events" / event_id / "layout_config.json", config_data)
        return config_data

    # ------------------------------------------------------------------
    # Guest operations
    # ------------------------------------------------------------------

    def get_all_guests(self, event_id: str) -> List[Dict]:
        return self._read_json(self.base_path / "events" / event_id / "guests.json") or []

    def get_guest_by_id(self, event_id: str, guest_id: str) -> Optional[Dict]:
        return next((g for g in self.get_all_guests(event_id) if g["id"] == guest_id), None)

    def create_guest(self, event_id: str, guest_data: Dict) -> Dict:
        guests = self.get_all_guests(event_id)
        guest_data.update(
            {
                "id": str(uuid.uuid4()),
                "event_id": event_id,
                "created_at": datetime.utcnow().isoformat(),
                "updated_at": datetime.utcnow().isoformat(),
            }
        )
        guests.append(guest_data)
        self._write_json(self.base_path / "events" / event_id / "guests.json", guests)
        return guest_data

    def update_guest(self, event_id: str, guest_id: str, update_data: Dict) -> Optional[Dict]:
        guests = self.get_all_guests(event_id)
        guest = next((g for g in guests if g["id"] == guest_id), None)
        if not guest:
            return None

        guest.update(update_data)
        guest["updated_at"] = datetime.utcnow().isoformat()
        self._write_json(self.base_path / "events" / event_id / "guests.json", guests)
        return guest

    def delete_guest(self, event_id: str, guest_id: str) -> bool:
        guests = self.get_all_guests(event_id)
        new_guests = [g for g in guests if g["id"] != guest_id]
        if len(new_guests) == len(guests):
            return False

        self._write_json(self.base_path / "events" / event_id / "guests.json", new_guests)
        return True

    def bulk_create_guests(self, event_id: str, guests_data: List[Dict]) -> List[Dict]:
        guests = self.get_all_guests(event_id)
        for g in guests_data:
            g.update(
                {
                    "id": str(uuid.uuid4()),
                    "event_id": event_id,
                    "created_at": datetime.utcnow().isoformat(),
                    "updated_at": datetime.utcnow().isoformat(),
                }
            )
            guests.append(g)

        self._write_json(self.base_path / "events" / event_id / "guests.json", guests)
        return guests_data


    def bulk_update_guests(self, event_id: str, updates: List[Dict]) -> List[Dict]:
        """
        Bulk update guests.
        updates: List of dicts, each must have 'id' and fields to update.
        """
        guests = self.get_all_guests(event_id)
        guest_map = {g["id"]: g for g in guests}
        updated_guests = []

        for update in updates:
            gid = update.get("id")
            if gid in guest_map:
                guest = guest_map[gid]
                guest.update(update)
                guest["updated_at"] = datetime.utcnow().isoformat()
                updated_guests.append(guest)
        
        if updated_guests:
            self._write_json(self.base_path / "events" / event_id / "guests.json", guests)
            
        return updated_guests


# Global database instance
db = JSONDatabase()
