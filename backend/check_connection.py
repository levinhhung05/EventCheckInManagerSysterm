import requests
import sys

BASE_URL = "http://localhost:8000"

def check_backend():
    print(f"Checking backend at {BASE_URL}...")
    try:
        # Check health
        resp = requests.get(f"{BASE_URL}/health")
        print(f"Health Check: {resp.status_code} - {resp.json()}")
        
        # Check root
        resp = requests.get(f"{BASE_URL}/")
        print(f"Root Check: {resp.status_code} - {resp.json()}")
        
        # Check API auth login (expected 422 for missing body, but confirms reachability)
        resp = requests.post(f"{BASE_URL}/api/auth/login", json={})
        print(f"Auth Endpoint Check (expect 422): {resp.status_code}")
        
    except Exception as e:
        print(f"Error connecting to backend: {e}")
        sys.exit(1)

if __name__ == "__main__":
    check_backend()
