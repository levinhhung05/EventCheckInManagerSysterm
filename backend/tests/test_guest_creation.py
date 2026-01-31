import requests
import json
import time

BASE_URL = "http://localhost:8000"
ADMIN_EMAIL = "admin@example.com"
ADMIN_PASSWORD = "admin123"

def test_guest_creation():
    # 1. Login
    print("Logging in...")
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    
    if response.status_code != 200:
        print(f"Login failed: {response.text}")
        return

    token = response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print("Login successful.")

    # 2. Create Event
    print("Creating event...")
    event_data = {
        "name": f"Test Event {int(time.time())}",
        "date": "2025-12-31T18:00:00",
        "location": "Test Location",
        "description": "Test Description"
    }
    response = requests.post(f"{BASE_URL}/api/events", json=event_data, headers=headers)
    if response.status_code != 201:
        print(f"Event creation failed: {response.text}")
        return
    
    event_id = response.json()["id"]
    print(f"Event created: {event_id}")

    # 3. Create Guest 1
    print("Creating Guest 1...")
    guest1 = {
        "full_name": "Guest One",
        "phone": "1111111111",
        "email": "guest1@example.com"
    }
    response = requests.post(f"{BASE_URL}/api/events/{event_id}/guests", json=guest1, headers=headers)
    if response.status_code == 201:
        print("Guest 1 created successfully.")
    else:
        print(f"Guest 1 creation failed: {response.text}")

    # 4. Create Guest 2 (Different Phone)
    print("Creating Guest 2 (Unique)...")
    guest2 = {
        "full_name": "Guest Two",
        "phone": "2222222222",
        "email": "guest2@example.com"
    }
    response = requests.post(f"{BASE_URL}/api/events/{event_id}/guests", json=guest2, headers=headers)
    if response.status_code == 201:
        print("Guest 2 created successfully.")
    else:
        print(f"Guest 2 creation failed: {response.text}")

    # 5. Create Guest 3 (Duplicate Phone of Guest 1)
    print("Creating Guest 3 (Duplicate Phone)...")
    guest3 = {
        "full_name": "Guest Three",
        "phone": "1111111111", # Duplicate
        "email": "guest3@example.com"
    }
    response = requests.post(f"{BASE_URL}/api/events/{event_id}/guests", json=guest3, headers=headers)
    if response.status_code == 400:
        print("Guest 3 creation failed as expected (Duplicate Phone).")
    else:
        print(f"Guest 3 unexpected status: {response.status_code} - {response.text}")

if __name__ == "__main__":
    test_guest_creation()
