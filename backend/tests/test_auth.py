"""
Tests for authentication endpoints.
"""
import pytest
from fastapi import status


def test_login_success(client):
    """Test successful login."""
    response = client.post(
        "/api/auth/login",
        json={"email": "admin@example.com", "password": "admin123"}
    )
    
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


def test_login_invalid_credentials(client):
    """Test login with invalid credentials."""
    response = client.post(
        "/api/auth/login",
        json={"email": "admin@example.com", "password": "wrongpassword"}
    )
    
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


def test_get_current_user(client, auth_headers):
    """Test getting current user info."""
    response = client.get("/api/auth/me", headers=auth_headers)
    
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["email"] == "admin@example.com"
    assert data["role"] == "super_admin"


def test_get_current_user_without_auth(client):
    """Test accessing protected endpoint without auth."""
    response = client.get("/api/auth/me")
    
    assert response.status_code == status.HTTP_403_FORBIDDEN


def test_change_password(client, auth_headers):
    """Test password change."""
    response = client.post(
        "/api/auth/change-password",
        headers=auth_headers,
        json={
            "old_password": "admin123",
            "new_password": "newpassword123"
        }
    )
    
    assert response.status_code == status.HTTP_200_OK
    
    # Try logging in with new password
    response = client.post(
        "/api/auth/login",
        json={"email": "admin@example.com", "password": "newpassword123"}
    )
    
    assert response.status_code == status.HTTP_200_OK
    
    # Change back to original password
    token = response.json()["access_token"]
    client.post(
        "/api/auth/change-password",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "old_password": "newpassword123",
            "new_password": "admin123"
        }
    )
