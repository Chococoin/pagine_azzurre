#!/usr/bin/env python3
"""
Timing Side-Channel Vulnerability Test
Tests signin endpoint for exploitable timing differences between valid and invalid emails
"""

import requests
import time
import statistics
from typing import List, Tuple
from scipy import stats

# Configuration
TARGET_URL = "http://localhost:3000/api/users/signin"
VALID_EMAIL = "pentest@shannon.local"
INVALID_EMAIL = "nonexistent_timing_test@example.com"
WRONG_PASSWORD = "wrong_password"
ITERATIONS = 15
HEADERS = {"Content-Type": "application/json"}

# Timing threshold for exploitability
EXPLOITABLE_THRESHOLD_MS = 50


def measure_response_time(email: str, password: str) -> float:
    """
    Measure response time for a single signin request
    Returns time in milliseconds
    """
    payload = {"email": email, "password": password}

    start_time = time.perf_counter()
    try:
        response = requests.post(TARGET_URL, json=payload, headers=HEADERS)
        end_time = time.perf_counter()

        # Calculate elapsed time in milliseconds
        elapsed_ms = (end_time - start_time) * 1000
        return elapsed_ms
    except Exception as e:
        print(f"Error during request: {e}")
        return 0


def collect_timing_samples(email: str, password: str, iterations: int) -> List[float]:
    """
    Collect multiple timing samples for statistical analysis
    """
    samples = []
    print(f"\nCollecting {iterations} samples for email: {email}")

    for i in range(iterations):
        timing = measure_response_time(email, password)
        samples.append(timing)
        print(f"  Sample {i+1}/{iterations}: {timing:.2f} ms")

        # Small delay to avoid overwhelming the server
        time.sleep(0.1)

    return samples


def analyze_timing_data(valid_samples: List[float], invalid_samples: List[float]) -> dict:
    """
    Perform statistical analysis on timing samples
    """
    # Calculate means
    valid_mean = statistics.mean(valid_samples)
    invalid_mean = statistics.mean(invalid_samples)

    # Calculate standard deviations
    valid_std = statistics.stdev(valid_samples) if len(valid_samples) > 1 else 0
    invalid_std = statistics.stdev(invalid_samples) if len(invalid_samples) > 1 else 0

    # Calculate timing difference
    timing_diff = valid_mean - invalid_mean

    # Perform independent t-test (two-tailed)
    t_statistic, p_value = stats.ttest_ind(valid_samples, invalid_samples)

    # Determine if exploitable
    is_exploitable = (
        timing_diff > EXPLOITABLE_THRESHOLD_MS and
        p_value < 0.05  # Statistically significant at 95% confidence
    )

    return {
        "valid_mean": valid_mean,
        "valid_std": valid_std,
        "invalid_mean": invalid_mean,
        "invalid_std": invalid_std,
        "timing_diff": timing_diff,
        "t_statistic": t_statistic,
        "p_value": p_value,
        "is_exploitable": is_exploitable
    }


def print_results(analysis: dict):
    """
    Print formatted results of the timing analysis
    """
    print("\n" + "="*70)
    print("TIMING SIDE-CHANNEL VULNERABILITY TEST RESULTS")
    print("="*70)

    print(f"\nValid Email ('{VALID_EMAIL}'):")
    print(f"  Mean response time:   {analysis['valid_mean']:.2f} ms")
    print(f"  Standard deviation:   {analysis['valid_std']:.2f} ms")

    print(f"\nInvalid Email ('{INVALID_EMAIL}'):")
    print(f"  Mean response time:   {analysis['invalid_mean']:.2f} ms")
    print(f"  Standard deviation:   {analysis['invalid_std']:.2f} ms")

    print(f"\nStatistical Analysis:")
    print(f"  Timing difference:    {analysis['timing_diff']:.2f} ms")
    print(f"  T-statistic:          {analysis['t_statistic']:.4f}")
    print(f"  P-value:              {analysis['p_value']:.6f}")
    print(f"  Significance level:   {('YES (p < 0.05)' if analysis['p_value'] < 0.05 else 'NO (p >= 0.05)')}")

    print("\n" + "="*70)
    print("VULNERABILITY ASSESSMENT")
    print("="*70)

    if analysis['is_exploitable']:
        print(f"\n⚠️  TIMING ATTACK CONFIRMED - EXPLOITABLE VULNERABILITY DETECTED")
        print(f"\nThe timing difference of {analysis['timing_diff']:.2f} ms exceeds the")
        print(f"exploitability threshold of {EXPLOITABLE_THRESHOLD_MS} ms and is statistically")
        print(f"significant (p = {analysis['p_value']:.6f} < 0.05).")
        print(f"\nAn attacker can use this timing difference to enumerate valid email")
        print(f"addresses in the system by measuring response times.")
        print(f"\nRecommendation: Implement constant-time comparison or add artificial")
        print(f"delays to eliminate timing differences between valid and invalid emails.")
    else:
        reasons = []
        if analysis['timing_diff'] <= EXPLOITABLE_THRESHOLD_MS:
            reasons.append(f"timing difference ({analysis['timing_diff']:.2f} ms) is below threshold ({EXPLOITABLE_THRESHOLD_MS} ms)")
        if analysis['p_value'] >= 0.05:
            reasons.append(f"difference is not statistically significant (p = {analysis['p_value']:.6f})")

        print(f"\n✓ No exploitable timing vulnerability detected")
        print(f"\nReason: {' AND '.join(reasons)}")

    print("\n" + "="*70 + "\n")


def main():
    """
    Main execution function
    """
    print("="*70)
    print("TIMING SIDE-CHANNEL VULNERABILITY TEST")
    print("="*70)
    print(f"\nTarget endpoint: {TARGET_URL}")
    print(f"Iterations per email: {ITERATIONS}")
    print(f"Exploitability threshold: {EXPLOITABLE_THRESHOLD_MS} ms")

    # Collect timing samples for valid email
    valid_samples = collect_timing_samples(VALID_EMAIL, WRONG_PASSWORD, ITERATIONS)

    # Collect timing samples for invalid email
    invalid_samples = collect_timing_samples(INVALID_EMAIL, WRONG_PASSWORD, ITERATIONS)

    # Analyze the timing data
    analysis = analyze_timing_data(valid_samples, invalid_samples)

    # Print results
    print_results(analysis)


if __name__ == "__main__":
    main()
