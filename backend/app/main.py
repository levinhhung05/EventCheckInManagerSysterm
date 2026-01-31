"""
Main FastAPI application entry point.
"""
from socketio import ASGIApp
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.socket.manager import sio
from app.socket import events as socket_events
from app.api import auth, events, guests, layouts, reports

# Create FastAPI app
app = FastAPI(
    title="Event Check-in Management System",
    version="1.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(events.router, prefix="/api/events", tags=["events"])
app.include_router(guests.router, prefix="/api/events", tags=["guests"])
app.include_router(layouts.router, prefix="/api/events", tags=["layouts"])
app.include_router(reports.router, prefix="/api/events", tags=["reports"])

# Health check
@app.get("/health")
async def health():
    return {"status": "healthy"}


@app.get("/api/health")
async def health_api():
    return {"status": "healthy"}


@app.get("/")
async def root():
    return {
        "message": "Welcome to Event Check-in Manager API",
        "docs": "/docs",
        "health": "/health"
    }

# Register Socket.IO event handlers (AFTER app is ready)
socket_events.register_handlers(sio)

# Mount FastAPI under Socket.IO
socket_app = ASGIApp(
    sio,
    other_asgi_app=app,
    socketio_path="socket.io"
)

# Export for uvicorn
__all__ = ['socket_app']
