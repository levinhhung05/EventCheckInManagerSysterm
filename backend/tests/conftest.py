"""
Pytest configuration and fixtures.
"""
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.storage.json_db import db
import tempfile
import shutil
from pathlib import Path


@pytest.fixture
def client():
    """Create a test client."""
    return TestClient(app)


@pytest.fixture
def test_data_dir():
    """Create a temporary data directory for tests."""
    temp_dir = tempfile.mkdtemp()
    original_data_dir = db.base_path
    db.base_path = Path(temp_dir)
    db._initialize_data()
    
    yield Path(temp_dir)
    
    # Cleanup
    db.base_path = original_data_dir
    shutil.rmtree(temp_dir)


@pytest.fixture
def auth_headers(client):
    """Get authentication headers with admin token."""
    response = client.post(
        "/api/auth/login",
        json={"email": "admin@example.com", "password": "admin123"}
    )
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def test_event(client, auth_headers):
    """Create a test event."""
    response = client.post(
        "/api/events",
        headers=auth_headers,
        json={
            "name": "Test Event",
            "date": "2025-12-31T18:00:00Z",
            "location": "Test Venue",
            "description": "Test Description"
        }
    )
    return response.json()


@pytest.fixture
def test_guest(client, auth_headers, test_event):
    """Create a test guest."""
    event_id = test_event["id"]
    response = client.post(
        f"/api/events/{event_id}/guests",
        headers=auth_headers,
        json={
            "full_name": "John Doe",
            "phone": "+1234567890",
            "company": "Test Corp",
            "email": "john@example.com"
        }
    )
    return response.json()
