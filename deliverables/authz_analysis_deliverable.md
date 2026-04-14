# Authorization Analysis - Pagine Azzurre

## Executive Summary

This analysis examines the authorization implementation for all IDOR-candidate endpoints in the Pagine Azzurre e-commerce platform. The application uses NextAuth for session management with custom credentials providers, and implements authorization checks at the API route level using `getServerSession()`.

**Critical Findings:**
- **3 HIGH SEVERITY** IDOR vulnerabilities discovered
- **2 MEDIUM SEVERITY** authorization bypass issues identified
- Inconsistent ownership validation across endpoints
- Missing authorization checks on sensitive operations

---

## Authentication Architecture

### NextAuth Configuration
- **File:** `/Users/chocos/Desktop/pagine_azzurre/nextjs/src/lib/auth/config.ts`
- **Lines:** 7-156
- **Strategy:** JWT-based session management with 30-day expiration
- **Providers:**
  1. `credentials` (lines 9-50): Standard email/password authentication
  2. `verification-autologin` (lines 51-95): One-shot token for post-email-verification auto-login

### Session Token Structure
The JWT token contains (lines 98-106):
```typescript
token.id = user.id;
token.isAdmin = user.isAdmin;
token.isSeller = user.isSeller;
token.hasAd = user.hasAd;
token.account = user.account;
token.sellerName = user.sellerName;
```

### Middleware Protection
- **File:** `/Users/chocos/Desktop/pagine_azzurre/nextjs/src/middleware.ts`
- **Lines:** 1-75
- **Scope:** Page-level route protection (lines 58-73)
- **Critical Gap:** Only protects frontend pages, **NOT API routes** (except those in matcher)

**Middleware Matcher (Lines 58-73):**
```typescript
matcher: [
  '/profile/:path*',
  '/orderhistory/:path*',
  '/order/:path*',
  '/shipping/:path*',
  '/payment/:path*',
  '/placeorder/:path*',
  '/admin/:path*',
  '/productlist/:path*',
  '/product/:id/edit',
  '/api/orders/:path*',      // Protected
  '/api/users/profile/:path*', // Protected
  '/api/uploads/:path*',       // Protected
]
```

**Public API Routes (Lines 31-43):**
```typescript
const publicApiRoutes = [
  '/api/auth',
  '/api/products',           // ⚠️ GET /api/products/:id is PUBLIC
  '/api/users/signin',
  '/api/users/register',
  '/api/users/password-recovery',
  '/api/users/password-replacement',
  '/api/users/verification',
  '/api/users/newsletter',
  '/api/users/sellers',
  '/api/users/top-sellers',
  '/api/config',
];
```

---

## Endpoint Authorization Analysis

### 1. GET /api/users/:id

**File:** `/Users/chocos/Desktop/pagine_azzurre/nextjs/src/app/api/users/[id]/route.ts`  
**Lines:** 13-43

| Category | Details |
|----------|---------|
| **Authentication Required** | ❌ NO - Publicly accessible |
| **Authorization Checks** | ❌ NONE |
| **Ownership Validation** | ❌ NONE |
| **Role Checks** | ❌ NONE |

**Vulnerability Details:**
```typescript
// Lines 13-43
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    await connectDB();
    
    const user = await UserModel.findById(id);
    
    if (!user) {
      return NextResponse.json({ message: 'Utente non trovato' }, { status: 404 });
    }
    
    // Get user data using toJSON to exclude sensitive fields
    const userData = user.toJSON();
    
    // Check newsletter status
    const newsletter = await NewsletterModel.findOne({ email: user.email });
    const newsletterStatus = newsletter?.verified ? 'Verified' : 'Not Verified';
    
    return NextResponse.json({
      ...userData,
      newsletter: newsletterStatus,
    });
  } catch (error) {
    // ...
  }
}
```

**IDOR Risk:** 🔴 **HIGH**

**Issues:**
1. **No authentication required** - Anyone can enumerate user IDs
2. **Information disclosure** - Exposes user profile data including:
   - `account` (blockchain wallet address)
   - `username`, `email`, `phone`, `cf` (tax code)
   - `city`, `zipCode`, `birthday`, `birthplace`, `gender`
   - `isAdmin`, `isSeller`, `hasAd` flags
   - `seller.name`, `seller.logo`, `seller.rating`
   - `referer` group memberships
   - Newsletter subscription status

**Data Sanitization:**
- `toJSON()` method (User model lines 110-117) excludes:
  - `accountKey` (private key)
  - `password`
  - `recoveryPasswordId`
  - `loginToken`
- **But still exposes sensitive PII** (email, phone, cf, birthday, etc.)

**Exploit Scenario:**
```bash
# Enumerate all users by iterating MongoDB ObjectIDs
curl https://pagineazzurre.com/api/users/507f1f77bcf86cd799439011
curl https://pagineazzurre.com/api/users/507f1f77bcf86cd799439012
# ... collect emails, phone numbers, tax codes for all users
```

---

### 2. PUT /api/users/:id

**File:** `/Users/chocos/Desktop/pagine_azzurre/nextjs/src/app/api/users/[id]/route.ts`  
**Lines:** 46-84

| Category | Details |
|----------|---------|
| **Authentication Required** | ✅ YES - `session?.user?.id` (line 48) |
| **Authorization Checks** | ✅ Admin-only (line 50) |
| **Ownership Validation** | ❌ NO - Admin can modify ANY user |
| **Role Checks** | ✅ `isAdmin` required |

**Authorization Check:**
```typescript
// Lines 48-52
const session = await getServerSession(authOptions);

if (!session?.user?.isAdmin) {
  return NextResponse.json({ message: 'Non autorizzato' }, { status: 401 });
}
```

**IDOR Risk:** 🟡 **MEDIUM**

**Issues:**
1. **Admin privilege required** - Correctly restricted to admin users
2. **No self-service update** - Regular users cannot update their own profiles via this endpoint
3. **Unrestricted admin power** - Admin can modify any user's `isAdmin` and `isSeller` flags (lines 66-69)

**Allowed Operations (Admin):**
```typescript
// Lines 66-69
user.name = body.name || user.name;
user.email = body.email || user.email;
user.isSeller = typeof body.isSeller === 'boolean' ? body.isSeller : user.isSeller;
user.isAdmin = typeof body.isAdmin === 'boolean' ? body.isAdmin : user.isAdmin;
```

**Note:** No separate endpoint found for users to update their own profile. Users likely use `/api/users/profile` (needs verification).

---

### 3. DELETE /api/users/:id

**File:** `/Users/chocos/Desktop/pagine_azzurre/nextjs/src/app/api/users/[id]/route.ts`  
**Lines:** 87-126

| Category | Details |
|----------|---------|
| **Authentication Required** | ✅ YES - `session?.user?.id` (line 89) |
| **Authorization Checks** | ✅ Admin-only (line 91) |
| **Ownership Validation** | ⚠️ Hardcoded admin protection (line 106) |
| **Role Checks** | ✅ `isAdmin` required |

**Authorization Check:**
```typescript
// Lines 89-93
const session = await getServerSession(authOptions);

if (!session?.user?.isAdmin) {
  return NextResponse.json({ message: 'Non autorizzato' }, { status: 401 });
}
```

**Admin Protection:**
```typescript
// Lines 106-111
if (user.email === 'admin@example.com') {
  return NextResponse.json(
    { message: 'Non è possibile eliminare l\'utente admin' },
    { status: 400 }
  );
}
```

**IDOR Risk:** 🟢 **LOW**

**Issues:**
1. **Properly restricted** - Admin-only access
2. **Hardcoded admin email** - Relies on `admin@example.com` check instead of checking `isAdmin` flag
3. **No self-deletion** - Users cannot delete their own accounts (may be intentional)

---

### 4. PUT /api/users/upgrade/:id

**File:** `/Users/chocos/Desktop/pagine_azzurre/nextjs/src/app/api/users/upgrade/[id]/route.ts`  
**Lines:** 12-66

| Category | Details |
|----------|---------|
| **Authentication Required** | ✅ YES - `session?.user?.id` (line 14) |
| **Authorization Checks** | ✅ Self-only (line 23) |
| **Ownership Validation** | ⚠️ **CRITICAL BUG** - Uses session.user.id instead of params.id |
| **Role Checks** | ❌ NONE |

**Critical Authorization Bug:**
```typescript
// Lines 14-27
const session = await getServerSession(authOptions);

if (!session?.user?.id) {
  return NextResponse.json({ message: 'Non autorizzato' }, { status: 401 });
}

await connectDB();

// ⚠️ BUG: Uses session.user.id instead of params.id
// User can only upgrade their own account
const user = await UserModel.findById(session.user.id);  // ⚠️ IGNORES :id PARAM

if (!user) {
  return NextResponse.json({ message: 'Utente non trovato' }, { status: 404 });
}
```

**IDOR Risk:** 🟢 **LOW** (but has a design flaw)

**Issues:**
1. **Path parameter ignored** - The `:id` parameter is never used (line 23)
2. **Always upgrades session user** - Impossible to upgrade other users even if admin
3. **Idempotency check** - Correctly prevents double-upgrade (lines 29-34)

**Design Flaw:**
The endpoint URL is `/api/users/upgrade/:id` but it always upgrades the authenticated user. The `:id` parameter is completely ignored. This is likely a design error - should either:
- Remove `:id` from the route → `/api/users/upgrade`
- OR use the `:id` parameter and validate ownership

**Actual Behavior:**
```bash
# All of these upgrade the authenticated user, not user 123
PUT /api/users/upgrade/123
PUT /api/users/upgrade/456
PUT /api/users/upgrade/999
```

---

### 5. GET /api/orders/:id

**File:** `/Users/chocos/Desktop/pagine_azzurre/nextjs/src/app/api/orders/[id]/route.ts`  
**Lines:** 12-41

| Category | Details |
|----------|---------|
| **Authentication Required** | ✅ YES - `session?.user?.id` (line 14) |
| **Authorization Checks** | ❌ **NONE** |
| **Ownership Validation** | ❌ **NONE** |
| **Role Checks** | ❌ NONE |

**CRITICAL Vulnerability:**
```typescript
// Lines 12-41
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Non autorizzato' }, { status: 401 });
    }
    
    const { id } = await params;
    await connectDB();
    
    const order = await OrderModel.findById(id);
    
    if (!order) {
      return NextResponse.json(
        { message: 'Ordine non trovato' },
        { status: 404 }
      );
    }
    
    // ❌ NO OWNERSHIP CHECK - Returns order to ANY authenticated user
    return NextResponse.json(order);
  } catch (error) {
    // ...
  }
}
```

**IDOR Risk:** 🔴 **CRITICAL**

**Issues:**
1. **Missing ownership validation** - No check if `order.user === session.user.id`
2. **Missing admin check** - Admin should be able to view all orders
3. **Missing seller check** - Seller should be able to view their orders

**Expected Authorization Logic:**
```typescript
// Should be:
if (
  order.user.toString() !== session.user.id &&
  order.seller?.toString() !== session.user.id &&
  !session.user.isAdmin
) {
  return NextResponse.json(
    { message: 'Non autorizzato a visualizzare questo ordine' },
    { status: 403 }
  );
}
```

**Sensitive Data Exposed:**
- Full order details including items, prices
- Buyer information (`order.user`)
- Seller information (`order.seller`)
- Shipping address (full name, address, phone)
- Payment method and payment result
- Payment status and timestamps

**Exploit Scenario:**
```bash
# Any authenticated user can view any order
curl -H "Cookie: next-auth.session-token=..." \
  https://pagineazzurre.com/api/orders/507f1f77bcf86cd799439011

# Iterate through order IDs to extract all orders
for id in $(generate_object_ids); do
  curl -H "Cookie: ..." https://pagineazzurre.com/api/orders/$id
done
```

---

### 6. PUT /api/orders/:id/pay

**File:** `/Users/chocos/Desktop/pagine_azzurre/nextjs/src/app/api/orders/[id]/pay/route.ts`  
**Lines:** 14-122

| Category | Details |
|----------|---------|
| **Authentication Required** | ✅ YES - `session?.user?.id` (line 16) |
| **Authorization Checks** | ✅ Buyer or Admin (lines 37-45) |
| **Ownership Validation** | ✅ YES - Validates order.user (line 38) |
| **Role Checks** | ✅ Admin override allowed |

**Authorization Check:**
```typescript
// Lines 35-45
// Only the buyer (or an admin) can pay the order — the on-chain
// transfer is signed with the buyer's wallet key.
if (
  order.user.toString() !== session.user.id &&
  !session.user.isAdmin
) {
  return NextResponse.json(
    { message: 'Solo il compratore può pagare questo ordine' },
    { status: 403 }
  );
}
```

**IDOR Risk:** 🟢 **LOW**

**Secure Implementation:**
1. **Ownership validation** - Correctly checks `order.user` matches `session.user.id`
2. **Admin override** - Admin can mark any order as paid
3. **Idempotency** - Prevents double-payment (lines 48-53)
4. **Business logic** - Integrates with blockchain escrow for Valazco token payments (lines 61-92)

**Payment Flow Security:**
- **Valazco Payment (lines 61-92):**
  - Retrieves buyer's private key from database (line 63)
  - Validates wallet configured (lines 65-70)
  - Transfers tokens to escrow contract (lines 76-79)
  - Updates order status (lines 90-96)

**Note:** Private key (`accountKey`) is stored in database and used server-side for blockchain transactions. This is a centralized custodial wallet design.

---

### 7. PUT /api/orders/:id/deliver

**File:** `/Users/chocos/Desktop/pagine_azzurre/nextjs/src/app/api/orders/[id]/deliver/route.ts`  
**Lines:** 14-106

| Category | Details |
|----------|---------|
| **Authentication Required** | ✅ YES - `session?.user?.id` (line 16) |
| **Authorization Checks** | ✅ Buyer or Admin (lines 37-45) |
| **Ownership Validation** | ✅ YES - Validates order.user (line 38) |
| **Role Checks** | ✅ Admin override allowed |

**Authorization Check:**
```typescript
// Lines 35-45
// Only the buyer (or an admin) can confirm receipt — confirming
// releases the escrowed VLZ to the seller's wallet.
if (
  order.user.toString() !== session.user.id &&
  !session.user.isAdmin
) {
  return NextResponse.json(
    { message: 'Solo il compratore può confermare la ricezione' },
    { status: 403 }
  );
}
```

**IDOR Risk:** 🟢 **LOW**

**Secure Implementation:**
1. **Ownership validation** - Correctly checks buyer ownership
2. **Pre-condition checks:**
   - Must be paid before delivery (lines 48-53)
   - Prevents double-delivery (lines 55-60)
3. **Escrow release** - Releases tokens to seller on delivery confirmation (lines 68-90)

---

### 8. GET /api/products/:id

**File:** `/Users/chocos/Desktop/pagine_azzurre/nextjs/src/app/api/products/[id]/route.ts`  
**Lines:** 12-38

| Category | Details |
|----------|---------|
| **Authentication Required** | ❌ NO - Publicly accessible |
| **Authorization Checks** | ❌ NONE |
| **Ownership Validation** | N/A (read-only public data) |
| **Role Checks** | ❌ NONE |

**Public Endpoint:**
```typescript
// Lines 12-38
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    await connectDB();
    
    const product = await ProductModel.findById(id).populate(
      'seller',
      'seller.name seller.logo seller.rating seller.numReviews'
    );
    
    if (!product) {
      return NextResponse.json(
        { message: 'Prodotto non trovato' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(product);
  } catch (error) {
    // ...
  }
}
```

**IDOR Risk:** 🟢 **NONE** (public by design)

**Rationale:**
- Product listings are intentionally public (e-commerce requirement)
- Middleware explicitly allows `/api/products` as public (middleware.ts line 33)
- No sensitive data - products are meant to be browsable

---

### 9. PUT /api/products/:id

**File:** `/Users/chocos/Desktop/pagine_azzurre/nextjs/src/app/api/products/[id]/route.ts`  
**Lines:** 41-139

| Category | Details |
|----------|---------|
| **Authentication Required** | ✅ YES - `session?.user?.id` (line 43) |
| **Authorization Checks** | ✅ Seller/Admin + Ownership (lines 45-76) |
| **Ownership Validation** | ✅ YES - Validates product.seller (line 71) |
| **Role Checks** | ✅ `isSeller` or `isAdmin` required |

**Authorization Check:**
```typescript
// Lines 43-76
const session = await getServerSession(authOptions);

if (!session?.user?.id) {
  return NextResponse.json({ message: 'Non autorizzato' }, { status: 401 });
}

if (!session.user.isSeller && !session.user.isAdmin) {
  return NextResponse.json(
    { message: 'Solo i venditori possono modificare prodotti' },
    { status: 403 }
  );
}

const { id } = await params;
const body = await request.json();

await connectDB();

const product = await ProductModel.findById(id);

if (!product) {
  return NextResponse.json(
    { message: 'Prodotto non trovato' },
    { status: 404 }
  );
}

// Check if user owns the product or is admin
if (product.seller.toString() !== session.user.id && !session.user.isAdmin) {
  return NextResponse.json(
    { message: 'Non autorizzato a modificare questo prodotto' },
    { status: 403 }
  );
}
```

**IDOR Risk:** 🟢 **LOW**

**Secure Implementation:**
1. **Multi-layer authorization:**
   - Layer 1: Authenticated user required
   - Layer 2: User must be seller OR admin
   - Layer 3: User must own product OR be admin
2. **Ownership validation** - Correctly compares `product.seller` with `session.user.id`
3. **Admin override** - Admin can modify any product

---

### 10. DELETE /api/products/:id

**File:** `/Users/chocos/Desktop/pagine_azzurre/nextjs/src/app/api/products/[id]/route.ts`  
**Lines:** 142-191

| Category | Details |
|----------|---------|
| **Authentication Required** | ✅ YES - `session?.user?.id` (line 144) |
| **Authorization Checks** | ✅ Seller/Admin + Ownership (lines 146-176) |
| **Ownership Validation** | ✅ YES - Validates product.seller (line 171) |
| **Role Checks** | ✅ `isSeller` or `isAdmin` required |

**Authorization Check:**
```typescript
// Lines 144-176
const session = await getServerSession(authOptions);

if (!session?.user?.id) {
  return NextResponse.json({ message: 'Non autorizzato' }, { status: 401 });
}

if (!session.user.isSeller && !session.user.isAdmin) {
  return NextResponse.json(
    { message: 'Solo i venditori possono eliminare prodotti' },
    { status: 403 }
  );
}

const { id } = await params;

await connectDB();

const product = await ProductModel.findById(id);

if (!product) {
  return NextResponse.json(
    { message: 'Prodotto non trovato' },
    { status: 404 }
  );
}

// Check if user owns the product or is admin
if (product.seller.toString() !== session.user.id && !session.user.isAdmin) {
  return NextResponse.json(
    { message: 'Non autorizzato a eliminare questo prodotto' },
    { status: 403 }
  );
}
```

**IDOR Risk:** 🟢 **LOW**

**Secure Implementation:**
- Identical authorization pattern as PUT /api/products/:id
- Three-layer authorization (auth → role → ownership)
- Admin override capability

---

## Additional Endpoints Analysis

### 11. Custom Sign-in Endpoint: POST /api/users/signin

**File:** `/Users/chocos/Desktop/pagine_azzurre/nextjs/src/app/api/users/signin/route.ts`  
**Lines:** 7-71

**Purpose:** Alternative to NextAuth's credentials provider for direct API access.

**Security Analysis:**
- **No rate limiting** - Vulnerable to brute force attacks
- **Leaks user existence** - Different error messages for "user not found" vs "invalid password"
- **Returns sensitive data** - Returns full user object including wallet address, roles, etc.
- **No session creation** - Just validates credentials and returns user data

**Code:**
```typescript
// Lines 21-28
const user = await UserModel.findOne({ email: email.toLowerCase() });

if (!user) {
  return NextResponse.json(
    { message: 'Email o password non validi' },  // Generic message
    { status: 401 }
  );
}
```

**Issues:**
1. **Duplicate authentication logic** - Same logic as NextAuth credentials provider
2. **No token returned** - Returns user data but no JWT token
3. **Unclear usage** - Not clear why this exists alongside NextAuth

---

### 12. GET /api/orders (All Orders)

**File:** `/Users/chocos/Desktop/pagine_azzurre/nextjs/src/app/api/orders/route.ts`  
**Lines:** 13-43

| Category | Details |
|----------|---------|
| **Authentication Required** | ✅ YES - `session?.user?.id` (line 15) |
| **Authorization Checks** | ✅ Seller/Admin only (lines 21-26) |
| **Ownership Validation** | ⚠️ Optional seller filter (line 31) |
| **Role Checks** | ✅ `isSeller` or `isAdmin` required |

**Authorization Check:**
```typescript
// Lines 15-26
const session = await getServerSession(authOptions);

if (!session?.user?.id) {
  return NextResponse.json({ message: 'Non autorizzato' }, { status: 401 });
}

if (!session.user.isSeller && !session.user.isAdmin) {
  return NextResponse.json(
    { message: 'Solo venditori e admin possono vedere tutti gli ordini' },
    { status: 403 }
  );
}
```

**IDOR Risk:** 🔴 **HIGH**

**Critical Vulnerability:**
```typescript
// Lines 30-34
const searchParams = request.nextUrl.searchParams;
const seller = searchParams.get('seller') || '';
const sellerFilter = seller ? { seller } : {};

const orders = await OrderModel.find({ ...sellerFilter }).populate('user', 'name');
```

**Issues:**
1. **No ownership enforcement** - Seller can specify any `seller` ID in query param
2. **Missing self-filter** - Should enforce `sellerFilter = { seller: session.user.id }`
3. **Admin gets unrestricted access** - Correct, but sellers can bypass restrictions

**Exploit:**
```bash
# Seller A can view Seller B's orders by changing the seller param
GET /api/orders?seller=507f1f77bcf86cd799439012  # Seller B's ID

# Seller can omit seller param to get ALL orders
GET /api/orders
```

**Expected Logic:**
```typescript
// Should be:
let sellerFilter = {};
if (session.user.isSeller && !session.user.isAdmin) {
  // Sellers can only see their own orders
  sellerFilter = { seller: session.user.id };
} else if (session.user.isAdmin) {
  // Admin can optionally filter by seller
  const seller = searchParams.get('seller') || '';
  sellerFilter = seller ? { seller } : {};
}
```

---

### 13. POST /api/orders (Create Order)

**File:** `/Users/chocos/Desktop/pagine_azzurre/nextjs/src/app/api/orders/route.ts`  
**Lines:** 47-179

| Category | Details |
|----------|---------|
| **Authentication Required** | ✅ YES - `session?.user?.id` (line 49) |
| **Authorization Checks** | ✅ Auth required (no role restrictions) |
| **Ownership Validation** | ✅ YES - Order created for session.user.id |
| **Role Checks** | ❌ Any authenticated user can create orders |

**Authorization Check:**
```typescript
// Lines 49-53
const session = await getServerSession(authOptions);

if (!session?.user?.id) {
  return NextResponse.json({ message: 'Non autorizzato' }, { status: 401 });
}
```

**Order Creation:**
```typescript
// Lines 94-105
const order = new OrderModel({
  seller: body.orderItems[0].seller,
  orderItems: normalizedOrderItems,
  shippingAddress: body.shippingAddress,
  paymentMethod: body.paymentMethod,
  itemsPriceVal: body.itemsPriceVal,
  itemsPriceEuro: body.itemsPriceEuro,
  totalPriceVal: body.totalPriceVal,
  totalPriceEuro: body.totalPriceEuro,
  shippingPrice: body.shippingPrice,
  user: session.user.id,  // ✅ Correctly assigns order to authenticated user
});
```

**IDOR Risk:** 🟢 **LOW**

**Secure Aspects:**
1. **Forced user assignment** - `order.user` is always set to `session.user.id`
2. **Cannot create orders for other users** - No way to manipulate user field

**Potential Issues:**
1. **No seller validation** - Trusts client-provided `body.orderItems[0].seller`
2. **No product validation** - Doesn't verify products exist or are available
3. **Price manipulation** - Trusts client-provided prices (should recalculate from products)

---

### 14. GET /api/users (List All Users)

**File:** `/Users/chocos/Desktop/pagine_azzurre/nextjs/src/app/api/users/route.ts`  
**Lines:** 13-33

| Category | Details |
|----------|---------|
| **Authentication Required** | ✅ YES - `session?.user?.isAdmin` (line 15) |
| **Authorization Checks** | ✅ Admin-only (line 17) |
| **Ownership Validation** | N/A (admin function) |
| **Role Checks** | ✅ `isAdmin` required |

**Authorization Check:**
```typescript
// Lines 15-19
const session = await getServerSession(authOptions);

if (!session?.user?.isAdmin) {
  return NextResponse.json({ message: 'Non autorizzato' }, { status: 401 });
}
```

**IDOR Risk:** 🟢 **LOW**

**Secure Implementation:**
- Admin-only access correctly enforced
- Returns sanitized user data via `toJSON()`

---

### 15. POST /api/users (Register)

**File:** `/Users/chocos/Desktop/pagine_azzurre/nextjs/src/app/api/users/route.ts`  
**Lines:** 37-169

| Category | Details |
|----------|---------|
| **Authentication Required** | ❌ NO (public registration) |
| **Authorization Checks** | ❌ NONE (public endpoint) |
| **Ownership Validation** | N/A |
| **Role Checks** | ❌ NONE |

**IDOR Risk:** 🟢 **NONE**

**Security Notes:**
1. **Public by design** - Registration must be unauthenticated
2. **Input validation** - Email regex, password length checks (lines 51-65)
3. **Uniqueness checks** - Email, username, sellername (lines 70-94)
4. **Automatic wallet creation** - Generates private key and wallet (lines 98-101)
5. **Email verification** - Sends verification link (lines 136-147)

**Sensitive Operation:**
```typescript
// Lines 98-101
const privateKey = generatePrivateKey();
const walletAccount = privateKeyToAccount(privateKey);

// Lines 104-107
const user = new UserModel({
  account: walletAccount.address,
  accountKey: privateKey,  // ⚠️ Private key stored in database
  // ...
});
```

---

### 16. POST /api/products (Create Product)

**File:** `/Users/chocos/Desktop/pagine_azzurre/nextjs/src/app/api/products/route.ts`  
**Lines:** 121-185

| Category | Details |
|----------|---------|
| **Authentication Required** | ✅ YES - `session?.user?.id` (line 123) |
| **Authorization Checks** | ✅ Seller/Admin only (lines 129-134) |
| **Ownership Validation** | ✅ YES - Product assigned to session.user.id |
| **Role Checks** | ✅ `isSeller` or `isAdmin` required |

**Authorization Check:**
```typescript
// Lines 123-134
const session = await getServerSession(authOptions);

if (!session?.user?.id) {
  return NextResponse.json({ message: 'Non autorizzato' }, { status: 401 });
}

if (!session.user.isSeller && !session.user.isAdmin) {
  return NextResponse.json(
    { message: 'Solo i venditori possono creare prodotti' },
    { status: 403 }
  );
}
```

**Product Creation:**
```typescript
// Lines 152-161
const product = new ProductModel({
  name: 'Annunciø n° ' + Date.now(),
  seller: session.user.id,  // ✅ Correctly assigns to authenticated user
  image: ['/images/offro_prodotto.jpg'],
  rating: 0,
  isService: false,
  numReviews: 0,
  city: sellerDoc?.city || '_',
  referer: defaultReferer,
});
```

**IDOR Risk:** 🟢 **LOW**

**Secure Implementation:**
1. **Seller role required** - Only sellers can create products
2. **Forced seller assignment** - `product.seller` always set to `session.user.id`
3. **hasAd flag update** - Automatically sets `hasAd = true` on first product (lines 169-172)

---

## Role Hierarchy Analysis

### Role Definitions

**From User Model (`/Users/chocos/Desktop/pagine_azzurre/nextjs/src/lib/db/models/User.ts`):**

1. **isAdmin** (line 86)
   - Default: `false`
   - Highest privilege level
   - Can perform all operations

2. **isSeller** (line 87)
   - Default: `true` (all users are sellers by default)
   - Can create/edit/delete own products
   - Can view own orders

3. **hasAd** (line 88)
   - Default: `false`
   - Set to `true` when seller creates first product
   - Used for feature gating (e.g., contact seller feature)

### Role Checks Summary

| Endpoint | isAdmin | isSeller | hasAd | Ownership |
|----------|---------|----------|-------|-----------|
| GET /api/users/:id | ❌ | ❌ | ❌ | ❌ |
| PUT /api/users/:id | ✅ | ❌ | ❌ | ❌ |
| DELETE /api/users/:id | ✅ | ❌ | ❌ | ⚠️ Hardcoded |
| PUT /api/users/upgrade/:id | ❌ | ❌ | ❌ | ⚠️ Buggy |
| GET /api/orders/:id | ❌ | ❌ | ❌ | ❌ MISSING |
| PUT /api/orders/:id/pay | ✅ Override | ❌ | ❌ | ✅ |
| PUT /api/orders/:id/deliver | ✅ Override | ❌ | ❌ | ✅ |
| GET /api/products/:id | N/A (public) | N/A | N/A | N/A |
| PUT /api/products/:id | ✅ Override | ✅ | ❌ | ✅ |
| DELETE /api/products/:id | ✅ Override | ✅ | ❌ | ✅ |
| GET /api/orders | ✅ | ✅ | ❌ | ❌ MISSING |
| POST /api/orders | ❌ | ❌ | ❌ | ✅ |
| GET /api/users | ✅ | ❌ | ❌ | N/A |
| POST /api/users | N/A (public) | N/A | N/A | N/A |
| POST /api/products | ✅ | ✅ | ❌ | ✅ |

---

## hasAd Flag Enforcement

### Purpose
The `hasAd` flag tracks whether a seller has published at least one product. It's used for:
1. **Feature gating** - Unlock contact seller feature after first product
2. **User journey** - Encourage sellers to create listings
3. **Spam prevention** - Prevent empty seller accounts from contacting others

### Enforcement Locations

**1. Product Creation (`/Users/chocos/Desktop/pagine_azzurre/nextjs/src/app/api/products/route.ts` lines 169-172):**
```typescript
// Flip hasAd the first time a seller publishes
await UserModel.updateOne(
  { _id: session.user.id, hasAd: { $ne: true } },
  { $set: { hasAd: true } }
);
```

**2. Session Token (`/Users/chocos/Desktop/pagine_azzurre/nextjs/src/lib/auth/config.ts` lines 103, 125, 140):**
```typescript
// JWT callback - includes hasAd in token
token.hasAd = user.hasAd;

// Session callback - includes hasAd in session
session.user.hasAd = token.hasAd as boolean;
```

### Authorization Impact

**No API-level enforcement found.** The `hasAd` flag is:
- ✅ Tracked in database
- ✅ Included in JWT token
- ✅ Included in session
- ❌ **NOT enforced** in any API authorization checks

**Expected enforcement** (not implemented):
```typescript
// Should restrict certain operations until seller has published
if (!session.user.hasAd && operationRequiresAd) {
  return NextResponse.json(
    { message: 'Devi pubblicare un annuncio prima di questa operazione' },
    { status: 403 }
  );
}
```

**Frontend enforcement** (likely):
The flag is probably enforced in the UI (React components) rather than API. This is **insecure** - client-side restrictions can be bypassed.

---

## Custom Sign-in vs NextAuth Analysis

### Two Authentication Mechanisms

**1. NextAuth Credentials Provider**
- **File:** `/Users/chocos/Desktop/pagine_azzurre/nextjs/src/lib/auth/config.ts`
- **Lines:** 9-50
- **Endpoint:** `/api/auth/signin` (handled by NextAuth)
- **Returns:** Session cookie (JWT)
- **Usage:** Primary authentication for web app

**2. Custom Sign-in Endpoint**
- **File:** `/Users/chocos/Desktop/pagine_azzurre/nextjs/src/app/api/users/signin/route.ts`
- **Lines:** 7-71
- **Endpoint:** `/api/users/signin`
- **Returns:** User object (no token)
- **Usage:** Unclear - possibly legacy or mobile app

### Code Duplication

Both implementations have **identical authentication logic**:

**NextAuth (auth/config.ts lines 16-37):**
```typescript
const user = await UserModel.findOne({ email: credentials.email.toLowerCase() });

if (!user) {
  throw new Error('Email o password non validi');
}

const isPasswordValid = bcrypt.compareSync(credentials.password, user.password);

if (!isPasswordValid) {
  throw new Error('Email o password non validi');
}

if (!user.verify.verified) {
  throw new Error('Account non verificato. Controlla la tua email.');
}
```

**Custom Signin (users/signin/route.ts lines 21-44):**
```typescript
const user = await UserModel.findOne({ email: email.toLowerCase() });

if (!user) {
  return NextResponse.json(
    { message: 'Email o password non validi' },
    { status: 401 }
  );
}

const isPasswordValid = bcrypt.compareSync(password, user.password);

if (!isPasswordValid) {
  return NextResponse.json(
    { message: 'Email o password non validi' },
    { status: 401 }
  );
}

if (!user.verify.verified) {
  return NextResponse.json(
    { message: 'Account non verificato. Controlla la tua email.' },
    { status: 401 }
  );
}
```

### Security Implications

1. **Maintenance burden** - Changes must be duplicated in both places
2. **Inconsistency risk** - Updates might miss one implementation
3. **Attack surface** - Two endpoints to attack instead of one
4. **No rate limiting** - Custom endpoint lacks protection
5. **No session creation** - Custom endpoint returns raw user data without proper session

### Recommendation

**Remove custom sign-in endpoint** and use NextAuth exclusively. If API authentication is needed:
- Use NextAuth's `getServerSession()` for API routes
- Or implement proper JWT token generation in custom endpoint

---

## Summary: Vulnerability Assessment Table

| Endpoint | Auth Required | Authz Checks | Ownership Validation | IDOR Risk | File:Line |
|----------|--------------|--------------|---------------------|-----------|-----------|
| **GET /api/users/:id** | ❌ NO | ❌ NONE | ❌ NONE | 🔴 **HIGH** | `/Users/chocos/Desktop/pagine_azzurre/nextjs/src/app/api/users/[id]/route.ts:13-43` |
| **PUT /api/users/:id** | ✅ YES | ✅ Admin-only | ❌ N/A (admin) | 🟡 MEDIUM | `/Users/chocos/Desktop/pagine_azzurre/nextjs/src/app/api/users/[id]/route.ts:46-84` |
| **DELETE /api/users/:id** | ✅ YES | ✅ Admin-only | ⚠️ Hardcoded email | 🟢 LOW | `/Users/chocos/Desktop/pagine_azzurre/nextjs/src/app/api/users/[id]/route.ts:87-126` |
| **PUT /api/users/upgrade/:id** | ✅ YES | ✅ Self-only | ⚠️ **Ignores :id param** | 🟢 LOW | `/Users/chocos/Desktop/pagine_azzurre/nextjs/src/app/api/users/upgrade/[id]/route.ts:12-66` |
| **GET /api/orders/:id** | ✅ YES | ❌ **NONE** | ❌ **MISSING** | 🔴 **CRITICAL** | `/Users/chocos/Desktop/pagine_azzurre/nextjs/src/app/api/orders/[id]/route.ts:12-41` |
| **PUT /api/orders/:id/pay** | ✅ YES | ✅ Buyer/Admin | ✅ `order.user` | 🟢 LOW | `/Users/chocos/Desktop/pagine_azzurre/nextjs/src/app/api/orders/[id]/pay/route.ts:14-122` |
| **PUT /api/orders/:id/deliver** | ✅ YES | ✅ Buyer/Admin | ✅ `order.user` | 🟢 LOW | `/Users/chocos/Desktop/pagine_azzurre/nextjs/src/app/api/orders/[id]/deliver/route.ts:14-106` |
| **GET /api/products/:id** | ❌ NO | ❌ N/A | ❌ N/A | 🟢 NONE | `/Users/chocos/Desktop/pagine_azzurre/nextjs/src/app/api/products/[id]/route.ts:12-38` |
| **PUT /api/products/:id** | ✅ YES | ✅ Seller/Admin + Ownership | ✅ `product.seller` | 🟢 LOW | `/Users/chocos/Desktop/pagine_azzurre/nextjs/src/app/api/products/[id]/route.ts:41-139` |
| **DELETE /api/products/:id** | ✅ YES | ✅ Seller/Admin + Ownership | ✅ `product.seller` | 🟢 LOW | `/Users/chocos/Desktop/pagine_azzurre/nextjs/src/app/api/products/[id]/route.ts:142-191` |
| **GET /api/orders** | ✅ YES | ✅ Seller/Admin | ❌ **User-controlled filter** | 🔴 **HIGH** | `/Users/chocos/Desktop/pagine_azzurre/nextjs/src/app/api/orders/route.ts:13-43` |
| **POST /api/orders** | ✅ YES | ✅ Auth required | ✅ Forced `session.user.id` | 🟢 LOW | `/Users/chocos/Desktop/pagine_azzurre/nextjs/src/app/api/orders/route.ts:47-179` |
| **GET /api/users** | ✅ YES | ✅ Admin-only | N/A | 🟢 LOW | `/Users/chocos/Desktop/pagine_azzurre/nextjs/src/app/api/users/route.ts:13-33` |
| **POST /api/users** | ❌ NO | N/A (public) | N/A | 🟢 NONE | `/Users/chocos/Desktop/pagine_azzurre/nextjs/src/app/api/users/route.ts:37-169` |
| **POST /api/products** | ✅ YES | ✅ Seller/Admin | ✅ Forced `session.user.id` | 🟢 LOW | `/Users/chocos/Desktop/pagine_azzurre/nextjs/src/app/api/products/route.ts:121-185` |
| **POST /api/users/signin** | ❌ NO | N/A (auth endpoint) | N/A | 🟡 MEDIUM | `/Users/chocos/Desktop/pagine_azzurre/nextjs/src/app/api/users/signin/route.ts:7-71` |

---

## Critical Vulnerabilities

### 🔴 CRITICAL: Horizontal Privilege Escalation - View Any Order

**Endpoint:** GET /api/orders/:id  
**File:** `/Users/chocos/Desktop/pagine_azzurre/nextjs/src/app/api/orders/[id]/route.ts`  
**Lines:** 12-41

**Vulnerability:**
Any authenticated user can view any order by iterating through order IDs. No ownership validation exists.

**Impact:**
- Exposure of all order details (items, prices, payment info)
- Exposure of buyer PII (shipping address, full name, phone)
- Exposure of seller information
- Privacy violation / GDPR breach

**Proof of Concept:**
```bash
# Login as User A
curl -X POST https://pagineazzurre.com/api/users/signin \
  -d '{"email":"usera@example.com","password":"password"}' \
  -c cookies.txt

# View User B's order
curl -b cookies.txt https://pagineazzurre.com/api/orders/507f1f77bcf86cd799439011
# Returns full order details including shipping address
```

**Fix:**
```typescript
// Add after line 31
if (
  order.user.toString() !== session.user.id &&
  order.seller?.toString() !== session.user.id &&
  !session.user.isAdmin
) {
  return NextResponse.json(
    { message: 'Non autorizzato a visualizzare questo ordine' },
    { status: 403 }
  );
}
```

---

### 🔴 HIGH: Information Disclosure - Enumerate All Users

**Endpoint:** GET /api/users/:id  
**File:** `/Users/chocos/Desktop/pagine_azzurre/nextjs/src/app/api/users/[id]/route.ts`  
**Lines:** 13-43

**Vulnerability:**
Public endpoint exposes sensitive user information without any authentication.

**Impact:**
- Enumeration of all users in the system
- Exposure of PII: email, phone, tax code (cf), birthday, address
- Exposure of wallet addresses
- Privacy violation / GDPR breach

**Exposed Data:**
- `account` (blockchain wallet)
- `email`, `phone`, `cf` (tax code)
- `city`, `zipCode`, `birthday`, `birthplace`, `gender`
- `isAdmin`, `isSeller`, `hasAd` (role information)
- `seller.name`, `seller.logo`, `referer` (business info)
- Newsletter subscription status

**Proof of Concept:**
```bash
# No authentication required
curl https://pagineazzurre.com/api/users/507f1f77bcf86cd799439011
# Returns full user profile

# Automated enumeration
for id in $(generate_mongodb_object_ids); do
  curl https://pagineazzurre.com/api/users/$id >> users_dump.json
done
```

**Fix:**
```typescript
// Add authentication check at line 14
const session = await getServerSession(authOptions);

if (!session?.user?.id) {
  return NextResponse.json({ message: 'Non autorizzato' }, { status: 401 });
}

// Add ownership or admin check
if (id !== session.user.id && !session.user.isAdmin) {
  // Return limited public profile instead of full profile
  return NextResponse.json({
    _id: user._id,
    username: user.username,
    seller: {
      name: user.seller.name,
      logo: user.seller.logo,
      rating: user.seller.rating,
      numReviews: user.seller.numReviews,
    }
  });
}

// Full profile for self or admin
return NextResponse.json({
  ...userData,
  newsletter: newsletterStatus,
});
```

---

### 🔴 HIGH: Horizontal Privilege Escalation - View Any Seller's Orders

**Endpoint:** GET /api/orders  
**File:** `/Users/chocos/Desktop/pagine_azzurre/nextjs/src/app/api/orders/route.ts`  
**Lines:** 13-43

**Vulnerability:**
Sellers can manipulate the `seller` query parameter to view other sellers' orders, or omit it to view all orders.

**Impact:**
- Any seller can view all orders in the system
- Exposure of competitor business data
- Exposure of buyer information
- Revenue leakage / business intelligence theft

**Proof of Concept:**
```bash
# Login as Seller A (ID: 507f1f77bcf86cd799439011)
curl -X POST https://pagineazzurre.com/api/users/signin \
  -d '{"email":"sellera@example.com","password":"password"}' \
  -c cookies.txt

# View all orders (no seller filter)
curl -b cookies.txt https://pagineazzurre.com/api/orders
# Returns ALL orders from all sellers

# View Seller B's orders specifically
curl -b cookies.txt "https://pagineazzurre.com/api/orders?seller=507f1f77bcf86cd799439022"
# Returns Seller B's orders
```

**Fix:**
```typescript
// Replace lines 30-34 with:
let sellerFilter = {};

if (session.user.isSeller && !session.user.isAdmin) {
  // Non-admin sellers can ONLY see their own orders
  sellerFilter = { seller: session.user.id };
} else if (session.user.isAdmin) {
  // Admin can optionally filter by seller
  const seller = searchParams.get('seller') || '';
  sellerFilter = seller ? { seller } : {};
}

const orders = await OrderModel.find({ ...sellerFilter }).populate('user', 'name');
```

---

## Recommendations

### Immediate Actions (Critical)

1. **Fix GET /api/orders/:id** - Add ownership validation
   ```typescript
   if (
     order.user.toString() !== session.user.id &&
     order.seller?.toString() !== session.user.id &&
     !session.user.isAdmin
   ) {
     return 403;
   }
   ```

2. **Fix GET /api/users/:id** - Require authentication and limit data exposure
   ```typescript
   // Require auth
   if (!session?.user?.id) return 401;
   
   // Return limited public profile for others
   if (id !== session.user.id && !session.user.isAdmin) {
     return limitedPublicProfile;
   }
   ```

3. **Fix GET /api/orders** - Enforce seller ownership filter
   ```typescript
   if (session.user.isSeller && !session.user.isAdmin) {
     sellerFilter = { seller: session.user.id }; // Force own orders only
   }
   ```

### High Priority

4. **Fix PUT /api/users/upgrade/:id** - Either remove :id param or validate it
   ```typescript
   const { id } = await params;
   
   // Option 1: Validate ID matches session
   if (id !== session.user.id && !session.user.isAdmin) {
     return 403;
   }
   const user = await UserModel.findById(id);
   
   // Option 2: Remove :id from route → /api/users/upgrade
   ```

5. **Remove duplicate signin endpoint** - Use NextAuth exclusively
   - Delete `/api/users/signin` route
   - Migrate any clients to NextAuth

6. **Add rate limiting** - Protect authentication endpoints
   - Use `next-rate-limit` or similar
   - Implement per-IP and per-user limits

### Medium Priority

7. **Standardize authorization checks** - Create reusable middleware
   ```typescript
   // lib/auth/guards.ts
   export function requireAuth(session) {
     if (!session?.user?.id) throw new UnauthorizedError();
   }
   
   export function requireAdmin(session) {
     if (!session?.user?.isAdmin) throw new ForbiddenError();
   }
   
   export function requireOwnership(resourceUserId, session) {
     if (resourceUserId !== session.user.id && !session.user.isAdmin) {
       throw new ForbiddenError();
     }
   }
   ```

8. **Enforce hasAd flag** - Move from UI to API
   ```typescript
   export function requireHasAd(session) {
     if (!session?.user?.hasAd && !session.user.isAdmin) {
       throw new ForbiddenError('Devi pubblicare un annuncio prima');
     }
   }
   ```

9. **Add authorization logging** - Track access attempts
   ```typescript
   console.log({
     timestamp: new Date(),
     userId: session.user.id,
     endpoint: request.url,
     action: 'view_order',
     resourceId: id,
     allowed: true/false,
   });
   ```

### Low Priority

10. **Fix DELETE /api/users/:id admin protection** - Use isAdmin flag
    ```typescript
    // Instead of hardcoded email check
    if (user.isAdmin) {
      return 400; // Cannot delete admin users
    }
    ```

11. **Add API documentation** - Document authorization requirements
    - OpenAPI/Swagger spec
    - Include required roles and ownership rules

12. **Add integration tests** - Test authorization logic
    ```typescript
    describe('GET /api/orders/:id', () => {
      it('should deny access to other users orders', async () => {
        const order = await createOrder({ user: userB.id });
        const response = await request(app)
          .get(`/api/orders/${order.id}`)
          .set('Cookie', userA.cookie);
        expect(response.status).toBe(403);
      });
    });
    ```

---

## Testing Recommendations

### Manual Testing Checklist

For each IDOR endpoint, test:

1. **Unauthenticated access**
   ```bash
   curl https://example.com/api/orders/123  # Should return 401
   ```

2. **Cross-user access** (User A accessing User B's resource)
   ```bash
   # Login as User A
   curl -c cookies.txt -X POST /api/auth/signin -d '{"email":"usera@example.com","password":"..."}'
   
   # Try to access User B's order
   curl -b cookies.txt /api/orders/{userBOrderId}  # Should return 403
   ```

3. **Admin override** (Admin accessing any resource)
   ```bash
   # Login as Admin
   curl -c admin_cookies.txt -X POST /api/auth/signin -d '{"email":"admin@example.com","password":"..."}'
   
   # Access any user's order
   curl -b admin_cookies.txt /api/orders/{anyOrderId}  # Should return 200
   ```

4. **Role restrictions** (Non-seller trying seller operations)
   ```bash
   # Login as regular user (isSeller=false)
   curl -c user_cookies.txt -X POST /api/auth/signin -d '{"email":"user@example.com","password":"..."}'
   
   # Try to create product
   curl -b user_cookies.txt -X POST /api/products -d '{...}'  # Should return 403
   ```

### Automated Testing

**Use Burp Suite or similar tools to:**

1. **Enumerate MongoDB ObjectIDs**
   - Generate sequential ObjectIDs around known IDs
   - Test access to each ID

2. **Parameter manipulation**
   - Change `seller=` query param in GET /api/orders
   - Modify IDs in path parameters

3. **Session token manipulation**
   - Decode JWT and modify `id` field
   - Test with modified tokens

### Security Testing Tools

1. **OWASP ZAP** - Automated vulnerability scanning
2. **Burp Suite Professional** - Manual testing + Intruder for enumeration
3. **Postman** - API testing with environment variables for different users
4. **Jest + Supertest** - Automated integration tests

---

## Compliance Considerations

### GDPR Impact

The identified vulnerabilities expose PII without proper access controls:

**Article 5 - Principles:**
- **Integrity and confidentiality** - Violated by unauthorized access to user data

**Article 32 - Security of processing:**
- **Appropriate technical measures** - Missing authorization controls

**Exposed PII:**
- Names, emails, phone numbers
- Tax codes (codice fiscale)
- Addresses, birthdates
- Payment information
- Order history

**Recommendations:**
1. Implement data minimization - Don't expose unnecessary fields
2. Add audit logging - Track who accessed what data
3. Implement data retention policies
4. Add GDPR consent tracking
5. Implement right to access/deletion mechanisms

---

## Code Quality Issues

### Inconsistent Authorization Patterns

**Good Examples:**
- `/api/products/:id` PUT/DELETE - Three-layer authorization (auth → role → ownership)
- `/api/orders/:id/pay` - Owner + admin override pattern

**Bad Examples:**
- `/api/users/:id` GET - No authorization at all
- `/api/orders/:id` GET - Auth but no ownership
- `/api/users/upgrade/:id` - Ignores path parameter

**Recommendation:** Standardize on the three-layer pattern:
```typescript
// Layer 1: Authentication
const session = await getServerSession(authOptions);
if (!session?.user?.id) return 401;

// Layer 2: Role check (if needed)
if (!session.user.isSeller && !session.user.isAdmin) return 403;

// Layer 3: Ownership validation
const resource = await Model.findById(id);
if (resource.userId.toString() !== session.user.id && !session.user.isAdmin) {
  return 403;
}
```

### Missing Abstraction

Authorization logic is duplicated across routes. Create shared guards:

```typescript
// lib/auth/guards.ts
export async function requireAuth(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new UnauthorizedError();
  }
  return session;
}

export function requireRole(session: Session, role: 'admin' | 'seller') {
  if (role === 'admin' && !session.user.isAdmin) {
    throw new ForbiddenError();
  }
  if (role === 'seller' && !session.user.isSeller && !session.user.isAdmin) {
    throw new ForbiddenError();
  }
}

export function requireOwnership<T extends { user?: ObjectId; seller?: ObjectId }>(
  resource: T,
  session: Session,
  field: 'user' | 'seller' = 'user'
) {
  const resourceUserId = resource[field]?.toString();
  if (resourceUserId !== session.user.id && !session.user.isAdmin) {
    throw new ForbiddenError();
  }
}

// Usage
const session = await requireAuth(request);
requireRole(session, 'seller');
const product = await ProductModel.findById(id);
requireOwnership(product, session, 'seller');
```

---

## Conclusion

The Pagine Azzurre application has **significant authorization vulnerabilities** that expose sensitive user and order data. The most critical issues are:

1. **GET /api/users/:id** - Public access to all user profiles (HIGH severity)
2. **GET /api/orders/:id** - Any authenticated user can view any order (CRITICAL severity)
3. **GET /api/orders** - Sellers can view all orders by manipulating query params (HIGH severity)

These vulnerabilities enable:
- **Horizontal privilege escalation** - Users accessing other users' data
- **Information disclosure** - PII exposure without authorization
- **Business intelligence theft** - Competitors viewing sales data
- **GDPR violations** - Unauthorized processing of personal data

**Immediate remediation** is required for the critical endpoints. The authorization framework should be standardized across all endpoints using a consistent three-layer approach (authentication → role → ownership).

**Impact Assessment:**
- **Confidentiality:** HIGH - Sensitive data exposed to unauthorized users
- **Integrity:** MEDIUM - Admin operations properly protected
- **Availability:** LOW - No DoS risks identified

**Overall Risk Rating:** 🔴 **HIGH** - Requires immediate attention