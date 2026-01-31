"""
Socket.IO event handlers for real-time communication.
"""
from typing import Dict, Any
from datetime import datetime

from app.storage.json_db import db

# Store active connections: {sid: {"user_id": str, "event_id": str}}
active_connections: Dict[str, Dict[str, str]] = {}


def register_handlers(sio) -> None:
    @sio.event
    async def connect(sid, environ):
        """Handle client connection."""
        print(f"Client connected: {sid}")
        active_connections[sid] = {}

    @sio.event
    async def disconnect(sid):
        """Handle client disconnection."""
        print(f"Client disconnected: {sid}")

        conn = active_connections.pop(sid, None)
        if conn and conn.get("event_id"):
            await sio.leave_room(sid, conn["event_id"])

    @sio.event
    async def join_event(sid, data):
        """
        Join an event room.
        data: {"event_id": str, "user_id": str}
        """
        event_id = data.get("event_id")
        user_id = data.get("user_id")

        if not event_id or not user_id:
            await sio.emit(
                "app_error",
                {"message": "Missing event_id or user_id"},
                room=sid,
            )
            return

        event = db.get_event_by_id(event_id)
        if not event:
            await sio.emit(
                "app_error",
                {"message": "Event not found"},
                room=sid,
            )
            return

        await sio.enter_room(sid, event_id)

        active_connections[sid] = {
            "event_id": event_id,
            "user_id": user_id,
        }

        await sio.emit(
            "joined_event",
            {
                "event_id": event_id,
                "message": "Successfully joined event",
            },
            room=sid,
        )

    @sio.event
    async def leave_event(sid, data):
        """Leave an event room."""
        event_id = data.get("event_id")

        conn = active_connections.get(sid)
        if conn and event_id:
            await sio.leave_room(sid, event_id)
            conn.pop("event_id", None)

            await sio.emit(
                "left_event",
                {
                    "event_id": event_id,
                    "message": "Left event",
                },
                room=sid,
            )

    @sio.event
    async def checkin(sid, data):
        event_id = data.get("event_id")
        guest_id = data.get("guest_id")
        user_id = data.get("user_id")

        if not all([event_id, guest_id, user_id]):
            await sio.emit(
                "app_error",
                {"message": "Missing required fields"},
                room=sid,
            )
            return

        guest = db.update_guest(
            event_id,
            guest_id,
            {
                "checked_in": True,
                "checked_in_at": datetime.utcnow().isoformat(),
                "checked_in_by": user_id,
            },
        )

        if not guest:
            await sio.emit(
                "app_error",
                {"message": "Guest not found"},
                room=sid,
            )
            return

        await sio.emit("guest_updated", guest, room=event_id)

        await sio.emit(
            "guest_checked_in",
            {
                "guest": guest,
                "checked_in_by": user_id,
                "timestamp": datetime.utcnow().isoformat(),
            },
            room=event_id,
        )

    @sio.event
    async def checkout(sid, data):
        event_id = data.get("event_id")
        guest_id = data.get("guest_id")
        user_id = data.get("user_id")

        if not all([event_id, guest_id, user_id]):
            await sio.emit(
                "app_error",
                {"message": "Missing required fields"},
                room=sid,
            )
            return

        guest = db.update_guest(
            event_id,
            guest_id,
            {
                "checked_in": False,
                "checked_in_at": None,
                "checked_in_by": None,
            },
        )

        if not guest:
            await sio.emit(
                "app_error",
                {"message": "Guest not found"},
                room=sid,
            )
            return

        await sio.emit(
            "guest_checked_out",
            {
                "guest": guest,
                "checked_out_by": user_id,
                "timestamp": datetime.utcnow().isoformat(),
            },
            room=event_id,
        )

    @sio.event
    async def layout_updated(sid, data):
        event_id = data.get("event_id")
        user_id = data.get("user_id")

        if not event_id:
            await sio.emit(
                "app_error",
                {"message": "Missing event_id"},
                room=sid,
            )
            return

        await sio.emit(
            "layout_changed",
            {
                "event_id": event_id,
                "updated_by": user_id,
                "timestamp": datetime.utcnow().isoformat(),
            },
            room=event_id,
            skip_sid=sid,
        )

    @sio.event
    async def guest_assigned(sid, data):
        event_id = data.get("event_id")
        if not event_id:
            await sio.emit(
                "app_error",
                {"message": "Missing event_id"},
                room=sid,
            )
            return

        await sio.emit("seat_assigned", data, room=event_id)


# ===== helpers for REST API =====

async def broadcast_checkin(sio, event_id: str, guest: dict, user_id: str):
    await sio.emit(
        "guest_checked_in",
        {
            "guest": guest,
            "checked_in_by": user_id,
            "timestamp": datetime.utcnow().isoformat(),
        },
        room=event_id,
    )


async def broadcast_checkout(sio, event_id: str, guest: dict, user_id: str):
    await sio.emit(
        "guest_checked_out",
        {
            "guest": guest,
            "checked_out_by": user_id,
            "timestamp": datetime.utcnow().isoformat(),
        },
        room=event_id,
    )
