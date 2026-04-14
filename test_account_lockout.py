#!/usr/bin/env python3
"""
Security Test: Account Lockout Protection Testing
Tests for missing account lockout by attempting multiple failed login attempts.
"""

import requests
import time
import json
from datetime import datetime

# Configuration
TARGET_URL = "http://localhost:3000/api/users/signin"
EMAIL = "pentest@shannon.local"
NUM_ATTEMPTS = 20
HEADERS = {
    "Content-Type": "application/json"
}

def test_account_lockout():
    """Test for account lockout protection by making multiple failed login attempts."""

    print("=" * 70)
    print("ACCOUNT LOCKOUT PROTECTION TEST")
    print("=" * 70)
    print(f"\nTarget: {TARGET_URL}")
    print(f"Email: {EMAIL}")
    print(f"Attempts: {NUM_ATTEMPTS}")
    print(f"Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
    print("-" * 70)

    results = []
    status_codes = {}
    response_times = []
    lockout_detected = False

    for i in range(1, NUM_ATTEMPTS + 1):
        password = f"wrong{i}"
        payload = {
            "email": EMAIL,
            "password": password
        }

        try:
            start_time = time.time()
            response = requests.post(TARGET_URL, json=payload, headers=HEADERS, timeout=10)
            end_time = time.time()

            response_time = (end_time - start_time) * 1000  # Convert to milliseconds
            response_times.append(response_time)

            # Track status codes
            status_code = response.status_code
            status_codes[status_code] = status_codes.get(status_code, 0) + 1

            # Try to parse response
            try:
                response_data = response.json()
            except:
                response_data = response.text[:100]

            # Check for lockout indicators
            is_blocked = status_code in [429, 403, 423]  # 429=Too Many Requests, 423=Locked
            if is_blocked:
                lockout_detected = True

            # Record result
            result = {
                "attempt": i,
                "password": password,
                "status_code": status_code,
                "response_time_ms": round(response_time, 2),
                "blocked": is_blocked,
                "response": response_data
            }
            results.append(result)

            # Print attempt details
            status_indicator = "[BLOCKED]" if is_blocked else "[OK]"
            print(f"Attempt {i:2d}: Password='{password:7s}' | "
                  f"Status={status_code} | "
                  f"Time={response_time:6.2f}ms {status_indicator}")

            # Small delay between requests to be more realistic
            time.sleep(0.1)

        except requests.exceptions.RequestException as e:
            print(f"Attempt {i:2d}: ERROR - {str(e)}")
            results.append({
                "attempt": i,
                "password": password,
                "error": str(e)
            })

    print("-" * 70)
    print("\nTEST SUMMARY")
    print("=" * 70)

    # Calculate statistics
    successful_attempts = len([r for r in results if "status_code" in r])
    avg_response_time = sum(response_times) / len(response_times) if response_times else 0

    print(f"\nTotal Attempts: {NUM_ATTEMPTS}")
    print(f"Successful Requests: {successful_attempts}")
    print(f"Average Response Time: {avg_response_time:.2f}ms")

    print(f"\nStatus Code Distribution:")
    for code, count in sorted(status_codes.items()):
        print(f"  {code}: {count} times")

    print(f"\nLockout Detection:")
    if lockout_detected:
        print("  ✓ ACCOUNT LOCKOUT DETECTED")
        print("  - Some requests were blocked (429, 403, or 423 status)")
        print("  - Account lockout protection appears to be PRESENT")
    else:
        print("  ✗ NO ACCOUNT LOCKOUT DETECTED")
        print("  - All attempts returned similar responses (likely 401)")
        print("  - Account lockout protection appears to be MISSING")

    print(f"\nVulnerability Assessment:")
    print("=" * 70)

    if not lockout_detected and len(set(r.get("status_code") for r in results if "status_code" in r)) == 1:
        # All attempts returned the same status code (likely 401)
        print("VULNERABILITY CONFIRMED: Missing Account Lockout Protection")
        print("\nFindings:")
        print("  - All 20 failed login attempts were processed")
        print("  - No rate limiting or account lockout mechanism detected")
        print("  - Attacker can perform unlimited password guessing attempts")
        print("  - This enables brute force and credential stuffing attacks")

        print("\nRisk:")
        print("  Severity: HIGH")
        print("  Impact: Unauthorized account access via brute force")
        print("  Likelihood: High (trivial to exploit)")

        print("\nRecommendation:")
        print("  1. Implement account lockout after N failed attempts (e.g., 5-10)")
        print("  2. Add progressive delays between failed attempts")
        print("  3. Implement CAPTCHA after multiple failures")
        print("  4. Add rate limiting per IP address")
        print("  5. Monitor and alert on multiple failed login attempts")
    else:
        print("Account lockout protection appears to be present.")
        print("Further testing may be needed to verify effectiveness.")

    print("\n" + "=" * 70)
    print(f"Test completed: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 70)

    # Save detailed results to file
    output_file = "/Users/chocos/Desktop/pagine_azzurre/account_lockout_test_results.json"
    with open(output_file, 'w') as f:
        json.dump({
            "test_name": "Account Lockout Protection Test",
            "timestamp": datetime.now().isoformat(),
            "target_url": TARGET_URL,
            "email": EMAIL,
            "num_attempts": NUM_ATTEMPTS,
            "lockout_detected": lockout_detected,
            "avg_response_time_ms": round(avg_response_time, 2),
            "status_codes": status_codes,
            "vulnerability_confirmed": not lockout_detected,
            "results": results
        }, f, indent=2)

    print(f"\nDetailed results saved to: {output_file}")

    return not lockout_detected  # Return True if vulnerability exists

if __name__ == "__main__":
    try:
        vulnerability_exists = test_account_lockout()
        exit(0 if vulnerability_exists else 1)
    except KeyboardInterrupt:
        print("\n\nTest interrupted by user.")
        exit(2)
    except Exception as e:
        print(f"\n\nUnexpected error: {e}")
        import traceback
        traceback.print_exc()
        exit(3)
