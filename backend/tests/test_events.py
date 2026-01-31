"""
Tests for event management endpoints.
"""
import pytest
from fastapi import status


def test_create_event(client, auth_headers):
    """Test creating a new event."""
    response = client.post(
        "/api/events",
        headers=auth_headers,
        json={
            "name": "Annual Conference",
            "date": "2025-12-31T18:00:00Z",
            "location": "Convention Center",
            "description": "Annual company conference"
        }
    )
    
    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert data["name"] == "Annual Conference"
    assert data["status"] == "draft"
    assert "id" in data


def test_list_events(client, auth_headers, test_event):
    """Test listing events."""
    response = client.get("/api/events", headers=auth_headers)
    
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 1


def test_get_event(client, auth_headers, test_event):
    """Test getting a specific event."""
    event_id = test_event["id"]
    response = client.get(f"/api/events/{event_id}", headers=auth_headers)
    
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["id"] == event_id
    assert data["name"] == test_event["name"]


def test_update_event(client, auth_headers, test_event):
    """Test updating an event."""
    event_id = test_event["id"]
    response = client.put(
        f"/api/events/{event_id}",
        headers=auth_headers,
        json={"name": "Updated Event Name"}
    )
    
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["name"] == "Updated Event Name"


def test_delete_event(client, auth_headers, test_event):
    """Test deleting an event."""
    event_id = test_event["id"]
    response = client.delete(f"/api/events/{event_id}", headers=auth_headers)
    
    assert response.status_code == status.HTTP_204_NO_CONTENT
    
    # Verify event is deleted
    response = client.get(f"/api/events/{event_id}", headers=auth_headers)
    assert response.status_code == status.HTTP_404_NOT_FOUND


def test_duplicate_event(client, auth_headers, test_event):
    """Test duplicating an event."""
    event_id = test_event["id"]
    response = client.post(
        f"/api/events/{event_id}/duplicate",
        headers=auth_headers,
        json={
            "new_name": "Duplicated Event",
            "new_date": "2026-01-15T18:00:00Z",
            "copy_layout": True,
            "copy_guests": False
        }
    )
    
    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert data["name"] == "Duplicated Event"
    assert data["id"] != event_id
