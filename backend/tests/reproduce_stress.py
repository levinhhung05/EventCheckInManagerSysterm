
import requests
import uuid
import random
import time
import json

BASE_URL = "http://localhost:8000/api"

def login(email, password):
    # Try /auth/login first
    try:
        res = requests.post(f"{BASE_URL}/auth/login", json={"email": email, "password": password})
        if res.status_code == 200:
            return res.json()["access_token"]
    except Exception as e:
        print(f"Login attempt 1 failed: {e}")

    # Fallback to /auth/token (OAuth2 standard)
    try:
        res = requests.post(f"{BASE_URL}/auth/token", data={"username": email, "password": password})
        if res.status_code == 200:
             return res.json()["access_token"]
    except Exception as e:
        print(f"Login attempt 2 failed: {e}")

    print(f"Login failed: {res.text} (Status: {res.status_code})")
    return None

def main():
    # Login
    token = login("admin@example.com", "admin123")
    if not token:
        return
    
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Get an event (or create one)
    events = requests.get(f"{BASE_URL}/events", headers=headers).json()
    if not events:
        print("No events found")
        return
    event_id = events[0]["id"]
    print(f"Using event: {event_id}")

    # 2. Create a table
    table_data = {
        "num_seats": 10,  # Create 10 seats
        "shape": "round",
        "width": 100,
        "height": 100,
        "position": {"x": 100, "y": 100},
        "rotation": 0
    }
    res = requests.post(f"{BASE_URL}/events/{event_id}/layout/tables", json=table_data, headers=headers)
    if res.status_code != 201:
        print(f"Failed to create table: {res.text}")
        return
    table = res.json()
    table_id = table["id"]
    print(f"Created table {table_id} with {len(table['seats'])} seats")

    # 3. Create and assign 5 guests
    created_guests = []
    for i in range(5):
        guest_data = {
            "full_name": f"Stress Guest {i}",
            "email": f"stress_{uuid.uuid4()}@example.com",
            "phone": f"555-{random.randint(1000000, 9999999)}"
        }
        res = requests.post(f"{BASE_URL}/events/{event_id}/guests", json=guest_data, headers=headers)
        if res.status_code != 201:
            print(f"Failed to create guest {i}: {res.text}")
            continue
        guest = res.json()
        created_guests.append(guest)
        
        # Assign to seat
        seat_id = table["seats"][i]["id"]
        assign_data = {
            "table_id": table_id,
            "seat_id": seat_id,
            "guest_id": guest["id"]
        }
        res = requests.post(f"{BASE_URL}/events/{event_id}/layout/assign-seat", json=assign_data, headers=headers)
        if res.status_code != 200:
             print(f"Failed to assign guest {i}: {res.text}")

    print(f"Created and assigned {len(created_guests)} guests")

    # 4. Delete table
    print("Deleting table (triggering multiple unassigns)...")
    start_time = time.time()
    res = requests.delete(f"{BASE_URL}/events/{event_id}/layout/tables/{table_id}", headers=headers)
    duration = time.time() - start_time
    
    if res.status_code != 204:
        print(f"Failed to delete table: {res.text}")
        return
    print(f"Deleted table in {duration:.2f} seconds")

    # 5. Verify all guests still exist and are unassigned
    guests = requests.get(f"{BASE_URL}/events/{event_id}/guests", headers=headers).json()
    
    missing_count = 0
    assigned_count = 0
    
    for cg in created_guests:
        found = next((g for g in guests if g["id"] == cg["id"]), None)
        if not found:
            print(f"BUG: Guest {cg['id']} disappeared!")
            missing_count += 1
        else:
            if found["table_id"] is not None:
                print(f"BUG: Guest {cg['id']} still assigned to {found['table_id']}")
                assigned_count += 1
    
    if missing_count == 0 and assigned_count == 0:
        print("SUCCESS: All guests recovered and unassigned.")
    else:
        print(f"FAILURE: Missing: {missing_count}, Still Assigned: {assigned_count}")

if __name__ == "__main__":
    main()
