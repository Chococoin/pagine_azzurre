#!/usr/bin/env python3
"""
Account Enumeration Testing Script
Tests registration endpoint for information leakage via error messages
"""

import requests
import json
import random
import string
from datetime import datetime

# Configuration
TARGET_URL = "http://localhost:3000/api/users/register"
HEADERS = {"Content-Type": "application/json"}

# Known existing values (from reconnaissance)
KNOWN_EMAIL = "pentest@shannon.local"
KNOWN_USERNAME = "pentest"
KNOWN_SELLERNAME = "pentest"  # Assuming this exists

def generate_random_string(length=10):
    """Generate random alphanumeric string"""
    return ''.join(random.choices(string.ascii_lowercase + string.digits, k=length))

def generate_random_email():
    """Generate random email address"""
    return f"{generate_random_string()}@{generate_random_string()}.local"

def test_enumeration_vector(vector_name, test_data):
    """
    Test a single enumeration vector

    Args:
        vector_name: Name of the field being tested
        test_data: Dictionary containing registration data

    Returns:
        Dictionary with test results
    """
    print(f"\n{'='*70}")
    print(f"Testing: {vector_name} Enumeration")
    print(f"{'='*70}")
    print(f"Request Data: {json.dumps(test_data, indent=2)}")

    try:
        response = requests.post(TARGET_URL, json=test_data, headers=HEADERS)

        result = {
            "vector": vector_name,
            "status_code": response.status_code,
            "response_text": response.text,
            "test_data": test_data
        }

        # Try to parse JSON response
        try:
            result["response_json"] = response.json()
        except:
            result["response_json"] = None

        print(f"\nStatus Code: {response.status_code}")
        print(f"Response: {response.text}")

        return result

    except Exception as e:
        print(f"Error during request: {str(e)}")
        return {
            "vector": vector_name,
            "error": str(e),
            "test_data": test_data
        }

def main():
    """Main testing function"""
    print("="*70)
    print("ACCOUNT ENUMERATION VULNERABILITY TEST")
    print("="*70)
    print(f"Target: {TARGET_URL}")
    print(f"Timestamp: {datetime.now().isoformat()}")

    results = []

    # Test 1: Email Enumeration
    # Use known existing email with random username/sellername/password
    email_test_data = {
        "email": KNOWN_EMAIL,
        "username": generate_random_string(),
        "sellername": generate_random_string(),
        "password": generate_random_string(16)
    }
    results.append(test_enumeration_vector("EMAIL", email_test_data))

    # Test 2: Username Enumeration
    # Use known existing username with random email/sellername/password
    username_test_data = {
        "email": generate_random_email(),
        "username": KNOWN_USERNAME,
        "sellername": generate_random_string(),
        "password": generate_random_string(16)
    }
    results.append(test_enumeration_vector("USERNAME", username_test_data))

    # Test 3: Seller Name Enumeration
    # Use known existing sellername with random email/username/password
    sellername_test_data = {
        "email": generate_random_email(),
        "username": generate_random_string(),
        "sellername": KNOWN_SELLERNAME,
        "password": generate_random_string(16)
    }
    results.append(test_enumeration_vector("SELLERNAME", sellername_test_data))

    # Analysis
    print("\n" + "="*70)
    print("ANALYSIS SUMMARY")
    print("="*70)

    error_messages = {}
    vulnerable = False

    for result in results:
        if "error" in result:
            print(f"\n{result['vector']}: Test failed - {result['error']}")
            continue

        vector = result['vector']
        status = result['status_code']

        # Extract error message
        error_msg = "N/A"
        if result['response_json']:
            error_msg = result['response_json'].get('message',
                        result['response_json'].get('error', str(result['response_json'])))
        else:
            error_msg = result['response_text']

        error_messages[vector] = {
            "status": status,
            "message": error_msg
        }

        print(f"\n{vector} Test:")
        print(f"  Status Code: {status}")
        print(f"  Error Message: {error_msg}")

    # Check for enumeration vulnerability
    print("\n" + "="*70)
    print("VULNERABILITY ASSESSMENT")
    print("="*70)

    unique_messages = set()
    for vector, data in error_messages.items():
        unique_messages.add(data['message'])

    if len(unique_messages) > 1:
        vulnerable = True
        print("\n⚠️  ENUMERATION VULNERABILITY CONFIRMED ⚠️")
        print("\nThe endpoint returns DIFFERENT error messages for different fields:")
        for vector, data in error_messages.items():
            print(f"  - {vector}: \"{data['message']}\"")
        print("\n✓ Attackers can enumerate:")
        if "Email" in str(error_messages.get('EMAIL', {}).get('message', '')):
            print("  ✓ Existing email addresses")
        if "Username" in str(error_messages.get('USERNAME', {}).get('message', '')):
            print("  ✓ Existing usernames")
        if "Seller" in str(error_messages.get('SELLERNAME', {}).get('message', '')):
            print("  ✓ Existing seller names")
    else:
        print("\n✓ No enumeration vulnerability detected")
        print("All tests returned the same generic error message:")
        print(f"  \"{list(unique_messages)[0] if unique_messages else 'N/A'}\"")

    # Recommendations
    if vulnerable:
        print("\n" + "="*70)
        print("RECOMMENDATIONS")
        print("="*70)
        print("""
1. Use a generic error message for all registration failures:
   "Registration failed. Please check your input and try again."

2. Implement rate limiting on registration endpoint

3. Consider using CAPTCHA for registration

4. Return the same HTTP status code (e.g., 400) for all validation errors

5. Log detailed errors server-side without exposing them to users
""")

    return results, vulnerable

if __name__ == "__main__":
    results, is_vulnerable = main()
