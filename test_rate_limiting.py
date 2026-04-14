#!/usr/bin/env python3
"""
Rate Limiting Test Script for Password Recovery Endpoint
Tests if the password recovery endpoint has proper rate limiting protection
"""

import requests
import time
from datetime import datetime

# Configuration
TARGET_URL = "http://localhost:3000/api/users/password-recovery"
NUM_REQUESTS = 50
EMAIL = "pentest@shannon.local"
HEADERS = {
    "Content-Type": "application/json"
}
PAYLOAD = {
    "email": EMAIL
}

def test_rate_limiting():
    """
    Send multiple requests to the password recovery endpoint
    and analyze responses to determine if rate limiting is present
    """
    print("=" * 70)
    print("PASSWORD RECOVERY RATE LIMITING TEST")
    print("=" * 70)
    print(f"Target URL: {TARGET_URL}")
    print(f"Test Email: {EMAIL}")
    print(f"Number of Requests: {NUM_REQUESTS}")
    print(f"Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 70)
    print()

    results = []
    status_codes = {}
    response_times = []

    for i in range(1, NUM_REQUESTS + 1):
        start_time = time.time()

        try:
            response = requests.post(
                TARGET_URL,
                json=PAYLOAD,
                headers=HEADERS,
                timeout=10
            )

            end_time = time.time()
            response_time = (end_time - start_time) * 1000  # Convert to milliseconds

            status_code = response.status_code

            # Track results
            results.append({
                "request_num": i,
                "status_code": status_code,
                "response_time": response_time,
                "success": True
            })

            # Count status codes
            status_codes[status_code] = status_codes.get(status_code, 0) + 1
            response_times.append(response_time)

            # Print each request result
            print(f"Request #{i:2d} | Status: {status_code} | Time: {response_time:.2f}ms")

            # Check for rate limiting indicators
            if status_code == 429:
                print(f"  └─> RATE LIMITED (429 Too Many Requests)")
            elif status_code == 200:
                print(f"  └─> Success")
            elif status_code == 404:
                print(f"  └─> Not Found (but request processed)")

        except requests.exceptions.RequestException as e:
            end_time = time.time()
            response_time = (end_time - start_time) * 1000

            results.append({
                "request_num": i,
                "status_code": "ERROR",
                "response_time": response_time,
                "success": False,
                "error": str(e)
            })

            print(f"Request #{i:2d} | ERROR | Time: {response_time:.2f}ms")
            print(f"  └─> {str(e)}")

        # Small delay to avoid overwhelming the server
        time.sleep(0.1)

    print()
    print("=" * 70)
    print("TEST RESULTS SUMMARY")
    print("=" * 70)

    # Summary statistics
    total_requests = len(results)
    successful_requests = sum(1 for r in results if r["success"])

    print(f"Total Requests Sent: {total_requests}")
    print(f"Requests Completed: {successful_requests}")
    print()

    print("Status Code Distribution:")
    for code, count in sorted(status_codes.items()):
        percentage = (count / total_requests) * 100
        print(f"  {code}: {count} requests ({percentage:.1f}%)")

    if response_times:
        avg_response_time = sum(response_times) / len(response_times)
        min_response_time = min(response_times)
        max_response_time = max(response_times)

        print()
        print("Response Time Statistics:")
        print(f"  Average: {avg_response_time:.2f}ms")
        print(f"  Minimum: {min_response_time:.2f}ms")
        print(f"  Maximum: {max_response_time:.2f}ms")

    print()
    print("=" * 70)
    print("RATE LIMITING ANALYSIS")
    print("=" * 70)

    # Analyze for rate limiting
    has_429 = 429 in status_codes
    all_succeeded = all(r.get("status_code") in [200, 404] for r in results if r["success"])

    if has_429:
        first_429 = next((r["request_num"] for r in results if r.get("status_code") == 429), None)
        print(f"RESULT: Rate limiting IS PRESENT")
        print(f"  - First 429 response at request #{first_429}")
        print(f"  - Total blocked requests: {status_codes[429]}")
        print(f"  - SECURITY STATUS: PROTECTED")
    elif all_succeeded and successful_requests == NUM_REQUESTS:
        print(f"RESULT: Rate limiting is MISSING")
        print(f"  - All {NUM_REQUESTS} requests succeeded (200/404)")
        print(f"  - No rate limiting detected")
        print(f"  - SECURITY STATUS: VULNERABLE")
        print()
        print("VULNERABILITY CONFIRMED:")
        print("  The password recovery endpoint does not implement rate limiting.")
        print("  An attacker could abuse this to:")
        print("    - Send unlimited password recovery emails")
        print("    - Enumerate valid email addresses")
        print("    - Perform denial of service via email flooding")
    else:
        print(f"RESULT: Inconclusive")
        print(f"  - Some requests failed but no 429 codes detected")
        print(f"  - May indicate network issues or other errors")

    print("=" * 70)
    print(f"Completed at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 70)

if __name__ == "__main__":
    test_rate_limiting()
