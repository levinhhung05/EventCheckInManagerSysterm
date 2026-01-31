import requests
import sys

BASE_URL = "http://localhost:8000/api"

def login():
    try:
        response = requests.post(f"{BASE_URL}/auth/login", json={
            "email": "admin@example.com",
            "password": "admin123"
        })
        response.raise_for_status()
        return response.json()["access_token"]
    except Exception as e:
        print(f"Login failed: {e}")
        sys.exit(1)

def verify_reports():
    token = login()
    headers = {"Authorization": f"Bearer {token}"}
    
    # 1. Get events
    print("Fetching events...")
    resp = requests.get(f"{BASE_URL}/events", headers=headers)
    resp.raise_for_status()
    events = resp.json()
    if not events:
        print("No events found. Creating one...")
        # Create event
        resp = requests.post(f"{BASE_URL}/events", headers=headers, json={
            "name": "Report Test Event",
            "date": "2025-12-31T18:00:00",
            "location": "Test Location",
            "description": "Testing reports"
        })
        resp.raise_for_status()
        event_id = resp.json()["id"]
    else:
        event_id = events[0]["id"]
    
    print(f"Using Event ID: {event_id}")
    
    # 2. Test Attendance Report
    print("Testing Attendance Report Endpoint...")
    resp = requests.get(f"{BASE_URL}/events/{event_id}/reports/attendance", headers=headers)
    if resp.status_code == 200:
        data = resp.json()
        print("✅ Attendance Report OK")
        print(f"   Total Guests: {data['total_guests']}")
        print(f"   Checked In: {data['checked_in_count']}")
    else:
        print(f"❌ Attendance Report Failed: {resp.status_code} - {resp.text}")
        
    # 3. Test Excel Export
    print("Testing Excel Export Endpoint...")
    resp = requests.get(f"{BASE_URL}/events/{event_id}/reports/export/excel", headers=headers)
    if resp.status_code == 200:
        if resp.headers.get("content-type") == "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
            print("✅ Excel Export OK (Content-Type correct)")
        else:
            print(f"⚠️ Excel Export Warning: Content-Type is {resp.headers.get('content-type')}")
    else:
        print(f"❌ Excel Export Failed: {resp.status_code} - {resp.text}")

    # 4. Test PDF Export
    print("Testing PDF Export Endpoint...")
    resp = requests.get(f"{BASE_URL}/events/{event_id}/reports/export/pdf", headers=headers)
    if resp.status_code == 200:
        if resp.headers.get("content-type") == "application/pdf":
            print("✅ PDF Export OK (Content-Type correct)")
        else:
            print(f"⚠️ PDF Export Warning: Content-Type is {resp.headers.get('content-type')}")
    else:
        print(f"❌ PDF Export Failed: {resp.status_code} - {resp.text}")

if __name__ == "__main__":
    verify_reports()
