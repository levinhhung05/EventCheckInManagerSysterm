import csv
import json
import sys
import os
from datetime import datetime
from passlib.context import CryptContext

# Configuration
JSON_FILE_PATH = os.path.join("backend", "data", "users.json")
CSV_FILE_PATH = "credentials.csv"

# Initialize bcrypt context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_password_hash(password: str) -> str:
    """Generate bcrypt hash for a password."""
    return pwd_context.hash(password)

def update_passwords(csv_path: str, json_path: str):
    """
    Update user passwords in JSON file based on CSV input.
    """
    # 1. Load JSON Data
    if not os.path.exists(json_path):
        print(f"Error: JSON file not found at {json_path}")
        return

    try:
        with open(json_path, 'r', encoding='utf-8') as f:
            users = json.load(f)
    except json.JSONDecodeError as e:
        print(f"Error: Failed to parse JSON file: {e}")
        return

    # Create a lookup dictionary for faster access: email -> user_index
    user_map = {user["email"]: i for i, user in enumerate(users)}
    
    updates_count = 0
    warnings = []

    # 2. Process CSV Data
    if not os.path.exists(csv_path):
        print(f"Error: CSV file not found at {csv_path}")
        return

    try:
        with open(csv_path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            
            # Verify CSV headers
            required_headers = ["Email", "Password"]
            if not reader.fieldnames or not all(h in reader.fieldnames for h in required_headers):
                print(f"Error: CSV must contain columns: {required_headers}")
                return

            print("Processing credentials...")
            
            for row in reader:
                email = row.get("Email", "").strip()
                password = row.get("Password", "").strip()
                
                if not email or not password:
                    continue

                if email in user_map:
                    index = user_map[email]
                    user = users[index]
                    
                    # Generate new hash
                    new_hash = get_password_hash(password)
                    
                    # Update fields
                    user["hashed_password"] = new_hash
                    user["updated_at"] = datetime.utcnow().isoformat()
                    
                    updates_count += 1
                    print(f"  [OK] Updated password for: {email}")
                else:
                    warnings.append(f"  [WARN] User not found: {email}")

    except Exception as e:
        print(f"Error reading CSV file: {e}")
        return

    # 3. Write updated JSON back to disk
    if updates_count > 0:
        try:
            with open(json_path, 'w', encoding='utf-8') as f:
                json.dump(users, f, indent=2)
            print(f"\nSuccess! Updated {updates_count} users in {json_path}")
        except Exception as e:
            print(f"Error writing to JSON file: {e}")
    else:
        print("\nNo updates were made.")

    # Print warnings
    if warnings:
        print("\nWarnings:")
        for w in warnings:
            print(w)

if __name__ == "__main__":
    # Allow command line arguments, but default to configured paths
    csv_file = sys.argv[1] if len(sys.argv) > 1 else CSV_FILE_PATH
    json_file = sys.argv[2] if len(sys.argv) > 2 else JSON_FILE_PATH
    
    print(f"Script started.")
    print(f"CSV Input:  {csv_file}")
    print(f"JSON Target: {json_file}")
    
    update_passwords(csv_file, json_file)
