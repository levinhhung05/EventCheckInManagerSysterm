import requests
import json
import sys

BASE_URL = "http://localhost:8000/api"

def login(email, password):
    response = requests.post(f"{BASE_URL}/auth/login", json={"email": email, "password": password})
    if response.status_code != 200:
        print(f"Login failed: {response.text}")
        return None
    return response.json()["access_token"]

def list_events(token):
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(f"{BASE_URL}/events", headers=headers)
    if response.status_code != 200:
        print(f"List events failed: {response.text}")
        return []
    return response.json()

def list_guests(token, event_id):
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(f"{BASE_URL}/events/{event_id}/guests", headers=headers)
    if response.status_code != 200:
        print(f"List guests failed: {response.text}")
        return []
    return response.json()

def check_in(token, event_id, guest_id):
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.post(f"{BASE_URL}/events/{event_id}/checkin", json={"guest_id": guest_id}, headers=headers)
    if response.status_code != 200:
        print(f"Check-in failed: {response.text}")
        return None
    return response.json()

def check_out(token, event_id, guest_id):
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.post(f"{BASE_URL}/events/{event_id}/checkout", json={"guest_id": guest_id}, headers=headers)
    if response.status_code != 200:
        print(f"Check-out failed: {response.text}")
        return None
    return response.json()

def main():
    # 1. Login as Admin to get an event and assign staff (setup)
    # Using default admin
    admin_token = login("admin@example.com", "admin123")
    if not admin_token:
        print("Admin login failed")
        return

    events = list_events(admin_token)
    if not events:
        print("No events found. Please create an event first.")
        return
    
    event_id = events[0]["id"]
    print(f"Using Event: {events[0]['name']} ({event_id})")

    # Ensure we have a staff user
    # For this test, I will try to login as the staff user from credentials.csv
    # If login fails, I might need to create it or update password.
    # Assuming the user exists from previous steps (update_passwords.py was run?)
    
    staff_email = "registration.desk1@eventmanager.com"
    staff_pass = "RegDesk#2025"
    
    print(f"Attempting staff login: {staff_email}")
    staff_token = login(staff_email, staff_pass)
    
    if not staff_token:
        print("Staff login failed. Trying to update user via admin...")
        # ... logic to create/update staff user ...
        # But wait, I can just use the admin token to assign the event to the staff user if they exist.
        # Let's assume the staff user exists in users.json.
        pass

    if not staff_token:
        print("Skipping staff specific test, checking guest logic with admin token")
        staff_token = admin_token # Fallback for testing logic

    # 2. List guests
    guests = list_guests(staff_token, event_id)
    if not guests:
        print("No guests found. Creating a dummy guest...")
        # Create a guest
        headers = {"Authorization": f"Bearer {admin_token}"}
        new_guest = {
            "full_name": "Test Guest",
            "phone": "1234567890",
            "email": "test@guest.com"
        }
        res = requests.post(f"{BASE_URL}/events/{event_id}/guests", json=new_guest, headers=headers)
        if res.status_code == 201:
            guests = [res.json()]
        else:
            print(f"Failed to create guest: {res.text}")
            return

    guest = guests[0]
    guest_id = guest["id"]
    print(f"Testing with Guest: {guest['full_name']} ({guest_id})")

    # 3. Check In
    print("Checking in...")
    res = check_in(staff_token, event_id, guest_id)
    if res:
        print("Check-in successful")
        if res['guest']['checked_in'] != True:
            print("ERROR: Guest status not updated in response")
    
    # Verify list
    guests_after = list_guests(staff_token, event_id)
    g_after = next(g for g in guests_after if g['id'] == guest_id)
    print(f"Guest status after check-in: {g_after['checked_in']}")

    # 4. Check Out
    print("Checking out...")
    res = check_out(staff_token, event_id, guest_id)
    if res:
        print("Check-out successful")
    
    # Verify list
    guests_final = list_guests(staff_token, event_id)
    g_final = next(g for g in guests_final if g['id'] == guest_id)
    print(f"Guest status after check-out: {g_final['checked_in']}")

if __name__ == "__main__":
    main()
