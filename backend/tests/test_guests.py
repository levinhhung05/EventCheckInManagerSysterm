"""
Tests for guest management and check-in endpoints.
"""
import pytest
from fastapi import status


def test_create_guest(client, auth_headers, test_event):
    """Test creating a new guest."""
    event_id = test_event["id"]
    response = client.post(
        f"/api/events/{event_id}/guests",
        headers=auth_headers,
        json={
            "full_name": "Jane Smith",
            "phone": "+9876543210",
            "company": "Design Co",
            "email": "jane@example.com"
        }
    )
    
    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert data["full_name"] == "Jane Smith"
    assert data["checked_in"] is False


def test_list_guests(client, auth_headers, test_event, test_guest):
    """Test listing guests."""
    event_id = test_event["id"]
    response = client.get(f"/api/events/{event_id}/guests", headers=auth_headers)
    
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 1


def test_search_guests(client, auth_headers, test_event, test_guest):
    """Test searching guests."""
    event_id = test_event["id"]
    response = client.get(
        f"/api/events/{event_id}/guests?search=John",
        headers=auth_headers
    )
    
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert len(data) >= 1
    assert "John" in data[0]["full_name"]


def test_update_guest(client, auth_headers, test_event, test_guest):
    """Test updating a guest."""
    event_id = test_event["id"]
    guest_id = test_guest["id"]
    
    response = client.put(
        f"/api/events/{event_id}/guests/{guest_id}",
        headers=auth_headers,
        json={"company": "Updated Corp"}
    )
    
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["company"] == "Updated Corp"


def test_check_in_guest(client, auth_headers, test_event, test_guest):
    """Test checking in a guest."""
    event_id = test_event["id"]
    guest_id = test_guest["id"]
    
    response = client.post(
        f"/api/events/{event_id}/checkin",
        headers=auth_headers,
        json={"guest_id": guest_id}
    )
    
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["guest"]["checked_in"] is True
    assert data["guest"]["checked_in_at"] is not None


def test_check_out_guest(client, auth_headers, test_event, test_guest):
    """Test checking out a guest."""
    event_id = test_event["id"]
    guest_id = test_guest["id"]
    
    # First check in
    client.post(
        f"/api/events/{event_id}/checkin",
        headers=auth_headers,
        json={"guest_id": guest_id}
    )
    
    # Then check out
    response = client.post(
        f"/api/events/{event_id}/checkout",
        headers=auth_headers,
        json={"guest_id": guest_id}
    )
    
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["guest"]["checked_in"] is False


def test_delete_guest(client, auth_headers, test_event, test_guest):
    """Test deleting a guest."""
    event_id = test_event["id"]
    guest_id = test_guest["id"]
    
    response = client.delete(
        f"/api/events/{event_id}/guests/{guest_id}",
        headers=auth_headers
    )
    
    assert response.status_code == status.HTTP_204_NO_CONTENT
