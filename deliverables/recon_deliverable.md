# Reconnaissance Deliverable: Pagine Azzurre E-Commerce Platform

## 0) HOW TO READ THIS

This reconnaissance report provides a comprehensive map of the Pagine Azzurre application's attack surface, with special emphasis on authorization and privilege escalation opportunities for the Authorization Analysis Specialist.

**Key Sections for Authorization Analysis:**
- **Section 4 (API Endpoint Inventory):** Contains authorization details for each endpoint - focus on "Required Role" and "Object ID Parameters" columns to identify IDOR candidates.
- **Section 6.4 (Guards Directory):** Catalog of authorization controls - understand what each guard means before analyzing vulnerabilities.
- **Section 7 (Role & Privilege Architecture):** Complete role hierarchy and privilege mapping - use this to understand the privilege lattice and identify escalation targets.
- **Section 8 (Authorization Vulnerability Candidates):** Pre-prioritized lists of endpoints for horizontal, vertical, and context-based authorization testing.

**How to Use the Network Mapping (Section 6):** The entity/flow mapping shows system boundaries and data sensitivity levels. Pay special attention to flows marked with authorization guards and entities handling PII/sensitive data.

**Priority Order for Testing:** Start with Section 8's High-priority horizontal candidates, then vertical escalation endpoints for each role level, finally context-based workflow bypasses.

---

## 1. Executive Summary

**Pagine Azzurre** is an Italian e-commerce marketplace platform that enables users to buy and sell products using both traditional fiat currency (EUR) and cryptocurrency (VAL token, ETH). The application serves as a community marketplace with blockchain integration for payments and user rewards.

**Core Technology Stack:**
- **Frontend:** Next.js 14 (React framework), TypeScript, Tailwind CSS
- **Backend:** Next.js API Routes (App Router), Node.js
- **Database:** MongoDB with Mongoose ODM
- **Authentication:** NextAuth.js v4 with JWT strategy (30-day expiration)
- **Blockchain:** Ethereum integration via viem library, Infura RPC
- **Hosting/Infrastructure:** Unknown production environment (development on localhost:3000)
- **File Storage:** Local disk + AWS S3 for product images
- **Email:** SendGrid for transactional emails (verification, password recovery, order notifications)

**Primary User-Facing Components:**
1. **Authentication System:** Email/password registration with mandatory email verification, password recovery via keccak256 tokens
2. **Product Marketplace:** Five categories (Offro, Cerco, Propongo, Avviso, Dono) with advanced filtering and search
3. **Order Management:** Complete order lifecycle (create, pay, deliver) with email notifications
4. **Blockchain Wallet:** Auto-generated Ethereum wallet per user with private keys stored in database
5. **User Profiles:** Public seller profiles with ratings, organization affiliations
6. **Admin Panel:** User/product/order management dashboard

**Attack Surface Scope:**
- 60+ network-accessible API endpoints (REST)
- 15+ public pages
- 10+ authenticated user pages
- 5+ admin-only pages
- 2 file upload endpoints (local + S3)
- Web3 payment processing endpoint

---

## 2. Technology & Service Map

### 2.1 Frontend Stack
- **Framework:** Next.js 14.2.5 (React 18, App Router architecture)
- **Language:** TypeScript 5
- **Styling:** Tailwind CSS 3.4.4
- **State Management:** Zustand 4 (cart, user session)
- **Authentication Library:** NextAuth.js 4.24.7
- **Blockchain Library:** viem 2 (Ethereum interactions)
- **HTTP Client:** Native fetch API
- **Forms:** React Hook Form (inferred from usage patterns)
- **Maps:** Google Maps JavaScript API (via `@googlemaps/js-api-loader`)

### 2.2 Backend Stack
- **Runtime:** Node.js (version unknown, likely v18+)
- **Framework:** Next.js 14 API Routes (serverless functions)
- **Language:** TypeScript 5
- **Database ORM:** Mongoose 7.6 (MongoDB)
- **Authentication:** NextAuth.js 4 (JWT sessions, HTTP-only cookies)
- **Validation:** express-validator (partial implementation)
- **Password Hashing:** bcryptjs (8 salt rounds - weak)
- **Web3 Provider:** viem 2.x (wallet generation, transaction signing)
- **Email Service:** SendGrid SDK
- **File Upload:** multer, multer-s3 (AWS S3 integration)
- **Payments:** PayPal SDK (client-side integration)

### 2.3 Infrastructure
- **Database:** MongoDB Atlas (cloud-hosted, connection string in environment variables)
- **File Storage:**
  - Local: `/uploads/` directory (development)
  - Cloud: AWS S3 bucket `pagineazzurre2` (public-read ACL)
- **Blockchain RPC:** Infura (Ethereum node provider)
- **Email:** SendGrid API
- **CDN:** Unknown (likely Vercel or Cloudflare if in production)
- **Hosting:** Development environment on localhost:3000
- **Session Storage:** HTTP-only cookies (NextAuth manages)

### 2.4 Identified Subdomains
**Status:** No subdomain enumeration performed (target is localhost)

**Expected Production Domains (inferred from code):**
- Main application domain (unknown)
- S3 bucket: `pagineazzurre2.s3.amazonaws.com`
- Infura RPC: `mainnet.infura.io` or `goerli.infura.io`
- SendGrid: `sendgrid.com` (email relay)

### 2.5 Open Ports & Services
**Status:** Target is localhost:3000 (development environment)

**Expected Production Ports:**
- **443/TCP:** HTTPS (frontend + API)
- **27017/TCP:** MongoDB (Atlas, not directly exposed)

**Development Environment:**
- **3000/TCP:** Next.js development server

---

## 3. Authentication & Session Management Flow

### 3.1 Entry Points

**Primary Authentication Endpoints:**
1. **POST /api/auth/[...nextauth]** - NextAuth.js handler (credentials provider)
2. **POST /api/users/signin** - Legacy custom signin (DEPRECATED, returns user data without creating session)
3. **POST /api/users/register** - User registration with email verification requirement
4. **POST /api/users/verification/[id]** - Email verification with one-time auto-login token
5. **POST /api/users/password-recovery** - Generates password reset link with keccak256 token
6. **POST /api/users/password-replacement** - Resets password using recovery token

**Frontend Pages:**
- `/signin` - Login form
- `/register` - Registration form with organization selection
- `/password-recovery` - Password reset request
- `/password-recovery/[id]` - Password reset form
- `/verification/[id]` - Email verification landing page

### 3.2 Authentication Mechanism (Step-by-Step)

**Flow 1: Standard Login**
1. User navigates to `/signin`
2. User submits email and password
3. Frontend calls `signIn('credentials', { email, password, redirect: false })`
4. NextAuth sends POST to `/api/auth/callback/credentials`
5. Credentials provider (`/lib/auth/config.ts:9-50`) validates:
   - Email format and existence in MongoDB
   - Password comparison via bcryptjs (`bcrypt.compare()`)
   - Email verification status (`user.verify.verified === true`)
6. If valid, NextAuth generates JWT with claims:
   ```typescript
   {
     id: user._id,
     isAdmin: user.isAdmin,
     isSeller: user.isSeller,
     hasAd: user.hasAd,
     account: user.account,     // Blockchain wallet address
     sellerName: user.seller.name
   }
   ```
7. JWT signed with `NEXTAUTH_SECRET` (HS256 algorithm)
8. HTTP-only cookie set: `next-auth.session-token` (30-day expiration)
9. User redirected to callbackUrl (default: `/`)

**Flow 2: Registration + Auto-Login**
1. User submits registration form at `/register`
2. POST `/api/users/register` with: username, email, password, organizations[], newsletter flag
3. Backend performs:
   - Password hashing: `bcrypt.hash(password, 8)` (weak: 8 salt rounds)
   - Ethereum wallet generation: `createWalletClient().account` (viem library)
   - **CRITICAL:** Private key stored in plaintext in `user.accountKey` field
   - Blockchain reward transaction: 100 VLZ tokens + 0.01 ETH gas (if enabled)
   - UUID generation for email verification: `user.verify.trusted_link`
4. Verification email sent via SendGrid with link: `/verification/[trusted_link]`
5. User stored with `verify.verified: false` (login blocked until verified)
6. User clicks verification link
7. Frontend sends POST `/api/users/verification/[id]` with `uuid` in body
8. Backend atomically updates:
   - Sets `verify.verified: true`
   - Generates one-shot `loginToken` (UUID v4)
   - Uses `findOneAndUpdate` to prevent race conditions
9. Frontend receives `loginToken` and calls `signIn('verification-autologin', { token })`
10. NextAuth's second credentials provider (`verification-autologin`) validates token
11. Token atomically cleared from database (`$unset: { loginToken: '' }`)
12. JWT session created as in Flow 1
13. Hard reload to homepage (`window.location.href = '/'`)

**Flow 3: Password Recovery**
1. User submits email at `/password-recovery`
2. POST `/api/users/password-recovery` finds user by email
3. **Recovery token generated:** `keccak256(currentPasswordHash)` 
   - Clever: token auto-invalidates when password changes
   - Stored in `user.recoveryPasswordId`
4. Email sent with link: `/password-recovery/[recoveryId]`
5. User clicks link and submits new password
6. POST `/api/users/password-replacement` with `{ id: recoveryId, newData: newPassword }`
7. Backend validates `user.recoveryPasswordId === id`
8. New password hashed and stored
9. `recoveryPasswordId` cleared
10. **No session created** - user must manually login again

### 3.3 Code Pointers

**Authentication Logic:**
- **NextAuth Config:** `/lib/auth/config.ts` (lines 1-157)
  - Credentials provider: lines 9-50
  - Verification auto-login provider: lines 51-95
  - JWT callback (token generation): lines 98-134
  - Session callback (expose to client): lines 136-149
- **Registration:** `/app/api/users/register/route.ts` (lines 7-141)
- **Verification:** `/app/api/users/verification/[id]/route.ts` (lines 10-121)
- **Password Recovery:** `/app/api/users/password-recovery/route.ts` (lines 7-73)
- **Password Replacement:** `/app/api/users/password-replacement/route.ts` (lines 7-78)
- **Middleware (route protection):** `/middleware.ts` (lines 1-75)

**Session Management:**
- **Session validation:** `getServerSession(authOptions)` used in 60+ API routes
- **Token storage:** HTTP-only cookie (managed by NextAuth)
- **Token expiration:** 30 days (configured in config.ts:153)
- **CSRF protection:** NextAuth built-in for auth routes only
- **Logout:** Client calls `signOut({ callbackUrl: '/' })`

---

### 3.1 Role Assignment Process

**File:** `/lib/db/models/User.ts` (lines 1-135)

**Roles are assigned during registration:**
1. User submits registration form
2. Default assignment (`/app/api/users/register/route.ts:52-66`):
   ```typescript
   const user = new UserModel({
     username,
     email,
     password: hashedPassword,
     isSeller: true,           // DEFAULT: All users are sellers
     isAdmin: false,           // DEFAULT
     hasAd: false,             // DEFAULT
     verify: {
       verified: false,         // Requires email verification
       trusted_link: uuid()
     }
   });
   ```

**Role Upgrade Mechanisms:**
1. **Self-Service (hasAd flag):** POST `/api/users/upgrade/[id]`
   - Any authenticated user can set `hasAd: true` on own account
   - **BUG:** Endpoint accepts `:id` parameter but ignores it, always upgrades `req.user._id`
2. **Admin-Controlled:** PUT `/api/users/[id]` (admin only)
   - Admins can toggle `isAdmin`, `isSeller` flags for any user
   - **VULNERABILITY:** No check prevents admin from modifying own privileges

**Default Role for New Users:**
- `isSeller: true` (can create/manage products immediately)
- `isAdmin: false`
- `hasAd: false` (until self-upgraded)
- `verify.verified: false` (until email verification)

**Role Downgrade:**
- Only admins can downgrade roles via PUT `/api/users/[id]`

---

### 3.2 Privilege Storage & Validation

**Storage Locations:**
1. **Database (MongoDB User Model):**
   - `isAdmin: Boolean` (default: false)
   - `isSeller: Boolean` (default: true)
   - `hasAd: Boolean` (default: false)
   - `verify.verified: Boolean` (default: false)
   
2. **JWT Claims (NextAuth Token):**
   ```typescript
   // File: /lib/auth/config.ts:98-110
   {
     id: user._id,
     isAdmin: user.isAdmin,
     isSeller: user.isSeller,
     hasAd: user.hasAd,
     account: user.account,
     sellerName: user.seller?.name
   }
   ```

3. **Client Session (exposed to frontend):**
   ```typescript
   // File: /lib/auth/config.ts:136-149
   session.user = {
     id: token.id,
     email: user.email,
     name: user.name,
     isAdmin: token.isAdmin,
     isSeller: token.isSeller,
     // ... other safe fields
   }
   ```

**Validation Points:**
- **Middleware (frontend route protection):** `/middleware.ts:4-55`
  - Admin routes: lines 10-14 (checks `token?.isAdmin`)
  - Seller routes: lines 17-21 (checks `token?.isSeller || token?.isAdmin`)
  - Protected routes matcher: lines 58-74
- **API Route Guards:** `getServerSession()` called in 60+ endpoints
  - Example: `/app/api/orders/route.ts:15-18, 21-25`
  - Pattern: Check `session?.user?.id`, then optionally check `session.user.isAdmin`

**Cache/Session Persistence:**
- JWT token lasts 30 days (no auto-refresh on page load)
- Manual refresh via `useSession().update()` re-fetches user from DB
  - Triggers on: profile update, role change (admin action)
  - Updates mutable fields: `isAdmin`, `isSeller`, `hasAd`, `sellerName`
- Privileges cached in JWT until expiration or manual refresh

---

### 3.3 Role Switching & Impersonation

**Impersonation Features:** **NONE IMPLEMENTED**
- No admin impersonation capability found
- No "sudo mode" or privilege elevation

**Role Switching:** **NONE IMPLEMENTED**
- Roles are static until admin modifies them or user self-upgrades `hasAd`

**Audit Trail:** **NOT IMPLEMENTED**
- No logging of role changes
- No tracking of who modified user privileges

---

## 4. API Endpoint Inventory

**Network Surface Focus:** All endpoints below are network-accessible through the Next.js API routes. Development/build tools are excluded.

### 4.1 Authentication & User Management Endpoints

| Method | Endpoint Path | Required Role | Object ID Parameters | Authorization Mechanism | Description & Code Pointer |
|---|---|---|---|---|---|
| POST | /api/users/register | anon | None | None | Creates new user with blockchain wallet generation. `register/route.ts:7-141` |
| POST | /api/users/signin | anon | None | **DEPRECATED** - Returns user data without creating session | Legacy auth endpoint. `signin/route.ts:7-71` |
| POST | /api/auth/[...nextauth] | anon | None | NextAuth handler | Primary auth system (credentials, verification-autologin). `auth/[...nextauth]/route.ts:1-9` |
| POST | /api/users/verification/[id] | anon | `id` (trusted_link UUID) | One-time token validation | Email verification with auto-login token. `verification/[id]/route.ts:10-121` |
| POST | /api/users/password-recovery | anon | None | None | Generates password reset token. `password-recovery/route.ts:7-73` |
| POST | /api/users/password-replacement | anon | None | Recovery token validation | Resets password using keccak256 token. `password-replacement/route.ts:7-78` |
| GET | /api/users/[id] | **NONE (PUBLIC)** | `id` (user ObjectId) | **❌ CRITICAL VULN: No auth** | Returns user profile (email, phone, fiscal code exposed). `users/[id]/route.ts:13-43` |
| GET | /api/users/profile | user | None | NextAuth session | Returns authenticated user's own profile. `users/profile/route.ts:11-65` |
| PUT | /api/users/profile | user | None | NextAuth session + ownership (self) | Updates authenticated user's profile. `users/profile/route.ts:68-126` |
| PUT | /api/users/upgrade/[id] | user | `id` (ignored) | NextAuth session | Sets `hasAd: true` for authenticated user. **BUG:** Ignores `id` param. `users/upgrade/[id]/route.ts:12-66` |
| GET | /api/users | admin | None | NextAuth session + `isAdmin` check | Lists all users (sanitized). `users/route.ts:13-33` |
| PUT | /api/users/[id] | admin | `id` (user ObjectId) | NextAuth session + `isAdmin` check | Admin updates user roles/email. **❌ No self-modification check**. `users/[id]/route.ts:46-84` |
| DELETE | /api/users/[id] | admin | `id` (user ObjectId) | NextAuth session + `isAdmin` check | Admin deletes user. Protects `admin@example.com`. `users/[id]/route.ts:87-126` |
| GET | /api/users/sellers | anon | None | None | Returns list of all sellers (public profiles). `users/sellers/route.ts:6-25` |
| GET | /api/users/top-sellers | anon | None | None | Returns top 3 sellers by rating. `users/top-sellers/route.ts:6-26` |

---

### 4.2 Product Management Endpoints

| Method | Endpoint Path | Required Role | Object ID Parameters | Authorization Mechanism | Description & Code Pointer |
|---|---|---|---|---|---|
| GET | /api/products | anon | None | None | Product search with filters (name, category, price, rating, city, organization). `products/route.ts:14-118` |
| GET | /api/products/[id] | anon | `id` (product ObjectId) | None | Returns single product with seller details. `products/[id]/route.ts:12-38` |
| POST | /api/products | seller or admin | None | NextAuth session + `isSeller \|\| isAdmin` | Creates new product (assigns authenticated user as seller). `products/route.ts:121-185` |
| PUT | /api/products/[id] | seller or admin | `id` (product ObjectId) | NextAuth session + `isSeller \|\| isAdmin` + **ownership check** | Updates product. **✅ SECURE:** Validates `product.seller === session.user.id`. `products/[id]/route.ts:41-139` |
| DELETE | /api/products/[id] | seller or admin | `id` (product ObjectId) | NextAuth session + `isSeller \|\| isAdmin` + **ownership check** | Deletes product. **✅ SECURE:** Validates ownership. `products/[id]/route.ts:142-191` |
| POST | /api/products/[id]/reviews | user | `id` (product ObjectId) | NextAuth session | Adds review to product. **⚠️ No duplicate review check per user**. `products/[id]/reviews/route.ts:12-87` |
| GET | /api/products/categories | anon | None | None | Returns distinct product categories. `products/categories/route.ts:6-18` |

---

### 4.3 Order Management Endpoints

| Method | Endpoint Path | Required Role | Object ID Parameters | Authorization Mechanism | Description & Code Pointer |
|---|---|---|---|---|---|
| GET | /api/orders | seller or admin | None | NextAuth session + `isSeller \|\| isAdmin` | **❌ CRITICAL VULN:** Seller query param not enforced. Sellers can view all orders. `orders/route.ts:13-43` |
| GET | /api/orders/mine | user | None | NextAuth session + ownership (own orders) | Returns authenticated user's orders. **✅ SECURE**. `orders/mine/route.ts:11-30` |
| POST | /api/orders | user | None | NextAuth session | Creates new order (assigns authenticated user as buyer). `orders/route.ts:47-179` |
| GET | /api/orders/[id] | user | `id` (order ObjectId) | NextAuth session | **❌ CRITICAL VULN:** No ownership check. Any user can view any order. `orders/[id]/route.ts:12-41` |
| PUT | /api/orders/[id]/pay | user | `id` (order ObjectId) | NextAuth session + **ownership check** | Marks order as paid. **✅ SECURE:** Validates buyer or seller or admin. `orders/[id]/pay/route.ts:14-122` |
| PUT | /api/orders/[id]/deliver | user | `id` (order ObjectId) | NextAuth session + **ownership check** | Marks order as delivered. **✅ SECURE:** Validates seller or admin. `orders/[id]/deliver/route.ts:14-106` |
| DELETE | /api/orders/[id] | admin | `id` (order ObjectId) | NextAuth session + `isAdmin` check | Admin deletes order. **⚠️ No ownership validation**. `orders/[id]/route.ts:44-77` |

---

### 4.4 File Upload Endpoints

| Method | Endpoint Path | Required Role | Object ID Parameters | Authorization Mechanism | Description & Code Pointer |
|---|---|---|---|---|---|
| POST | /api/uploads | user | None | NextAuth session | Uploads image to local `/uploads/` directory. Filename: `Date.now().jpg`. `uploads/route.ts:12-28` |

---

### 4.5 Configuration Endpoints

| Method | Endpoint Path | Required Role | Object ID Parameters | Authorization Mechanism | Description & Code Pointer |
|---|---|---|---|---|---|
| GET | /api/config/paypal | anon | None | None | Returns PayPal client ID from environment. **⚠️ Public exposure**. Likely in server config or environment route. |
| GET | /api/config/google | anon | None | None | Returns Google Maps API key. **⚠️ Public exposure**. Likely in server config. |

---

### 4.6 Newsletter Endpoints

| Method | Endpoint Path | Required Role | Object ID Parameters | Authorization Mechanism | Description & Code Pointer |
|---|---|---|---|---|---|
| POST | /api/users/newsletter | anon | None | None | Subscribes email to newsletter. `users/newsletter/route.ts` (inferred location) |
| GET | /api/users/newsletter/[email] | anon | `email` | None | Checks newsletter subscription status. `users/newsletter/[email]/route.ts` (inferred) |
| POST | /api/users/newsletter/verify | anon | None | None | Verifies newsletter subscription. `users/newsletter/verify/route.ts` (inferred) |
| POST | /api/users/newsletter/update | anon | None | None | Updates newsletter subscription preferences. `users/newsletter/update/route.ts` (inferred) |

---

### 4.7 Organization/Taxonomy Endpoints

| Method | Endpoint Path | Required Role | Object ID Parameters | Authorization Mechanism | Description & Code Pointer |
|---|---|---|---|---|---|
| GET | /api/organizations | anon | None | None | Returns list of organizations for filtering/affiliation. Likely static data. |

---

## 5. Potential Input Vectors for Vulnerability Analysis

**Network Surface Focus:** All input vectors below are accessible through the target web application's HTTP interface.

### 5.1 URL Parameters (Query Strings)

**File:** `/app/api/products/route.ts:19-29`
```typescript
// All user-controlled query parameters:
const searchParams = new URL(request.url).searchParams;

// ❌ CRITICAL: No validation/sanitization
const name = searchParams.get('name') || '';           // Line 19 - Used in $regex (NoSQL injection)
const category = searchParams.get('category') || '';   // Line 20 - Used in filter (NoSQL injection)
const min = Number(searchParams.get('min')) || 0;      // Line 21 - Coerced to number (can be NaN)
const max = Number(searchParams.get('max')) || 0;      // Line 22 - Coerced to number (can be NaN)
const rating = Number(searchParams.get('rating')) || 0; // Line 23 - Coerced to number (can be NaN)
const order = searchParams.get('order') || '';         // Line 24 - Used in sort (limited by whitelist)
const city = searchParams.get('city') || '';           // Line 25 - Used in filter (NoSQL injection)
const seller = searchParams.get('seller') || '';       // Line 26 - Used in filter (NoSQL injection)
const organization = searchParams.get('organization') || ''; // Line 27 - Used in filter (NoSQL injection)
```

**Injection Risks:**
- `name`: **CRITICAL** - Used directly in `$regex: name` without escaping (line 48). ReDoS + NoSQL injection.
- `category`, `seller`, `city`, `organization`: **HIGH** - Used in MongoDB filters without validation. NoSQL injection.

**File:** `/app/api/orders/route.ts:30`
```typescript
const seller = searchParams.get('seller') || '';
const sellerFilter = seller ? { seller } : {};
// ❌ CRITICAL: User controls filter, no enforcement that seller === session.user.id for non-admins
```

---

### 5.2 POST Body Fields (JSON)

#### Registration Form
**Endpoint:** POST `/api/users/register`  
**File:** `/app/api/users/register/route.ts:16-30`

```typescript
// All user-controlled fields:
const username = body.username;        // ⚠️ No validation in endpoint (relies on client)
const email = body.email;              // ⚠️ No server-side validation
const password = body.password;        // ⚠️ No complexity validation
const referer = body.referer;          // ⚠️ No validation
const organizations = body.organizations; // ⚠️ Array - no validation
const newsletter = body.newsletter;    // ⚠️ Boolean - no validation
```

**Injection Risks:**
- No server-side validation found for registration endpoint
- Client-side validation bypassable

#### Password Recovery/Replacement
**Endpoint:** POST `/api/users/password-recovery`  
**File:** `/app/api/users/password-recovery/route.ts:12-16`

```typescript
const { email } = await request.json();
const user = await UserModel.findOne({ email });
// ❌ CRITICAL: Direct NoSQL injection - email not validated
```

**Endpoint:** POST `/api/users/password-replacement`  
**File:** `/app/api/users/password-replacement/route.ts:27-29`

```typescript
const { id, newPassword } = body;
const user = await UserModel.findOne({ recoveryPasswordId: id });
// ❌ CRITICAL: id not validated (NoSQL injection)
// ❌ CRITICAL: newPassword not validated (can be empty string)
```

#### Profile Update
**Endpoint:** PUT `/api/users/profile`  
**File:** `/app/api/users/profile/route.ts:75-100`

```typescript
// All mutable fields:
user.name = body.name || user.name;
user.surname = body.surname || user.surname;
user.birthday = body.birthday || user.birthday;
user.birthplace = body.birthplace || user.birthplace;
user.gender = body.gender || user.gender;
user.cf = body.cf || user.cf;           // Italian fiscal code
user.phone = body.phone || user.phone;
user.city = body.city || user.city;
user.zipCode = body.zipCode || user.zipCode;
user.partitaIva = body.partitaIva || user.partitaIva; // VAT number
user.seller.name = body.sellerName || user.seller.name;
user.seller.description = body.sellerDescription || user.seller.description;
// ⚠️ No validation on most fields (name, surname, birthday, etc.)
// ⚠️ Seller description could contain XSS payloads
```

#### Product Creation/Update
**Endpoint:** POST `/api/products`, PUT `/api/products/[id]`  
**File:** `/app/api/products/route.ts:128-165`

```typescript
// All product fields:
const productData = {
  seller: session.user.id,
  name: body.name,
  category: body.category,
  sections: body.sections,          // Array - no validation
  description: body.description,
  priceEuro: Number(body.priceEuro),
  priceVLZ: Number(body.priceVLZ),
  priceETH: Number(body.priceETH || 0),
  countInStock: Number(body.countInStock),
  location: {
    country: body.location.country,
    state: body.location.state,
    city: body.location.city,
    municipality: body.location.municipality,
  },
  organizations: body.organizations, // Array - no validation
  image: body.image,
};
// ⚠️ No validation on sections, organizations arrays
// ⚠️ Description not sanitized (stored XSS risk)
```

#### Review Submission
**Endpoint:** POST `/api/products/[id]/reviews`  
**File:** `/app/api/products/[id]/reviews/route.ts:27-32`

```typescript
const { rating, comment, name } = body;
const review = {
  name: name || session.user.username,
  rating: Number(rating),
  comment,
};
// ⚠️ No validation on comment (XSS risk)
// ⚠️ No max length enforcement
// ⚠️ No duplicate review check per user
```

#### Order Creation
**Endpoint:** POST `/api/orders`  
**File:** `/app/api/orders/route.ts:59-161`

```typescript
const orderData = {
  orderItems: body.orderItems,      // Array of products - no validation
  shippingAddress: {
    fullName: body.shippingAddress.fullName,
    address: body.shippingAddress.address,
    city: body.shippingAddress.city,
    postalCode: body.shippingAddress.postalCode,
    country: body.shippingAddress.country,
    phone: body.shippingAddress.phone,
    lat: body.shippingAddress.lat,       // ⚠️ No validation (can be any value)
    lng: body.shippingAddress.lng,       // ⚠️ No validation (can be any value)
  },
  paymentMethod: body.paymentMethod,
  // ... calculated fields
};
// ⚠️ No validation on shipping address fields
// ⚠️ Lat/lng coordinates not bounds-checked
```

#### Newsletter Subscription
**Endpoint:** POST `/api/users/newsletter`  
**File:** (Inferred from pre-recon analysis) `userRouter.js:466-495`

```typescript
// Email and name fields - no validation found
```

---

### 5.3 HTTP Headers

**Authorization Header:**
- **Pattern:** `Authorization: Bearer <JWT>`
- **Usage:** Parsed by NextAuth in every protected endpoint
- **Validation:** JWT signature verification only
- **Risk:** None (cryptographically signed tokens)

**Content-Type Header:**
- **Expected:** `application/json`
- **Risk:** None (standard header)

**Custom Headers:** None identified

---

### 5.4 Cookie Values

**Session Cookie:**
- **Name:** `next-auth.session-token` (or `__Secure-next-auth.session-token` on HTTPS)
- **Value:** Signed JWT (managed by NextAuth)
- **Attributes:** `httpOnly=true, secure=true (production), sameSite=lax`
- **Risk:** None (HTTP-only prevents XSS access)

**Cart Cookie (if used):**
- **Risk:** Client-side managed, not validated on backend

---

### 5.5 File Upload Inputs

**Endpoint:** POST `/api/uploads`  
**File:** `/app/api/uploads/route.ts` (inferred)

**Upload Vector:**
- **Field Name:** `image`
- **Accepted Types:** No validation (accepts any file)
- **Filename:** Set to `Date.now().jpg` (user filename ignored)
- **Size Limit:** Unknown (multer default: unlimited)
- **Storage:** Local disk `/uploads/` directory
- **Risk:** 
  - **LOW:** Filename sanitized (timestamp-based)
  - **MEDIUM:** No file type validation (binary files accepted as .jpg)
  - **MEDIUM:** No virus scanning

---

### 5.6 Path Parameters (Route Segments)

**User ID:**
- **Pattern:** `/api/users/[id]`
- **Example:** `/api/users/507f1f77bcf86cd799439011`
- **Validation:** Mongoose casts to ObjectId (prevents most injection)
- **Risk:** **HIGH** - IDOR if no ownership check (see Section 8.1)
- **File:** `/app/api/users/[id]/route.ts:25`

**Product ID:**
- **Pattern:** `/api/products/[id]`
- **Example:** `/api/products/507f1f77bcf86cd799439011`
- **Validation:** Mongoose ObjectId casting
- **Risk:** **MEDIUM** - Public access allowed
- **File:** `/app/api/products/[id]/route.ts:20`

**Order ID:**
- **Pattern:** `/api/orders/[id]`
- **Example:** `/api/orders/507f1f77bcf86cd799439011`
- **Validation:** Mongoose ObjectId casting
- **Risk:** **CRITICAL** - No ownership check, exposes PII
- **File:** `/app/api/orders/[id]/route.ts:25-26`

**Verification Link:**
- **Pattern:** `/api/users/verification/[id]`
- **Example:** `/api/users/verification/550e8400-e29b-41d4-a716-446655440000`
- **Validation:** UUID format expected (no validation code found)
- **Risk:** **LOW** - UUID hard to guess
- **File:** `/app/api/users/verification/[id]/route.ts:13`

**Password Recovery ID:**
- **Pattern:** `/password-recovery/[id]`
- **Example:** `/password-recovery/0x7f8a9b...` (keccak256 hash)
- **Validation:** Compared to `user.recoveryPasswordId`
- **Risk:** **LOW** - Hash-based token
- **File:** `/app/api/users/password-replacement/route.ts:27`

---

## 6. Network & Interaction Map

**Network Surface Focus:** Only components accessible through the deployed Next.js application on `http://localhost:3000`.

### 6.1 Entities

| Title | Type | Zone | Tech | Data | Notes |
|---|---|---|---|---|---|
| NextJsApp | Service | App | Next.js 14 / Node.js | PII, Tokens, Payments, Secrets | Main application server (frontend + API routes) |
| MongoDB | DataStore | Data | MongoDB Atlas | PII, Tokens, Payments, Secrets | Stores all application data (users, products, orders) |
| SendGrid | ThirdParty | ThirdParty | Email API | PII | Email delivery for verification, notifications |
| InfuraRPC | ThirdParty | ThirdParty | Ethereum node | Public | Blockchain transaction relay |
| S3Bucket | DataStore | Edge | AWS S3 | Public | Product image storage (public-read ACL) |
| GoogleMaps | ThirdParty | ThirdParty | Maps API | Public | Location services (address autocomplete, coordinates) |
| PayPal | ThirdParty | ThirdParty | Payment API | Payments | Payment processing (client-side integration) |
| UserBrowser | ExternAsset | Internet | Browser | PII, Tokens | End-user web browser |

---

### 6.2 Entity Metadata

| Title | Metadata |
|---|---|
| NextJsApp | **Hosts:** `http://localhost:3000`; **Endpoints:** `/api/users/*`, `/api/products/*`, `/api/orders/*`, `/api/uploads/*`, `/api/auth/*`, `/api/config/*`; **Auth:** NextAuth (JWT in HTTP-only cookie); **Dependencies:** MongoDB, SendGrid, InfuraRPC, S3Bucket; **Tech Stack:** Next.js 14.2.5, TypeScript 5, Mongoose 7.6, viem 2 |
| MongoDB | **Engine:** MongoDB Atlas (cloud); **Exposure:** Internal Only (via connection string); **Collections:** users, products, orders, newsletters; **Credentials:** `MONGODB_URL` env var; **Consumers:** NextJsApp |
| SendGrid | **API:** REST API v3; **Auth:** API Key (`SENDGRID_API_KEY`); **Rate Limits:** Unknown (SaaS tier); **Templates:** Verification email, password recovery, order notifications; **Consumers:** NextJsApp |
| InfuraRPC | **Network:** Ethereum Mainnet / Goerli Testnet; **URL:** `https://<network>.infura.io/v3/<PROJECT_ID>`; **Auth:** Project ID in URL; **Operations:** Transaction signing, gas estimation; **Consumers:** NextJsApp |
| S3Bucket | **Bucket Name:** `pagineazzurre2`; **Region:** Unknown; **ACL:** `public-read` (all objects publicly accessible); **Contents:** Product images (JPEG); **Consumers:** NextJsApp, UserBrowser |
| GoogleMaps | **API:** JavaScript API, Places API; **Auth:** API Key (`GOOGLE_API_KEY`); **Features:** Autocomplete, geocoding; **Consumers:** UserBrowser (client-side) |
| PayPal | **SDK:** PayPal Checkout; **Client ID:** `PAYPAL_CLIENT_ID` (exposed to frontend); **Integration:** Client-side button; **Consumers:** UserBrowser |
| UserBrowser | **Platforms:** Chrome, Firefox, Safari, Edge; **Session Storage:** HTTP-only cookie (`next-auth.session-token`); **Local Storage:** Cart data (Zustand persist); **Capabilities:** JavaScript, Fetch API, Web3 wallet (MetaMask) |

---

### 6.3 Flows (Connections)

| FROM → TO | Channel | Path/Port | Guards | Touches | Description |
|---|---|---|---|---|---|
| UserBrowser → NextJsApp | HTTPS | `:3000 /` | none | Public | Public pages (home, product listings, seller profiles) |
| UserBrowser → NextJsApp | HTTPS | `:3000 /api/users/register` | none | PII, Secrets | User registration with email/password |
| UserBrowser → NextJsApp | HTTPS | `:3000 /api/auth/[...nextauth]` | none | PII | NextAuth signin (credentials provider) |
| UserBrowser → NextJsApp | HTTPS | `:3000 /api/users/profile` | auth:user | PII | Profile fetch/update |
| UserBrowser → NextJsApp | HTTPS | `:3000 /api/products/*` | none (read), auth:seller (write) | Public (read), PII (seller info) | Product CRUD operations |
| UserBrowser → NextJsApp | HTTPS | `:3000 /api/orders/*` | auth:user | PII, Payments | Order creation, payment, delivery |
| UserBrowser → NextJsApp | HTTPS | `:3000 /api/uploads` | auth:user | Public | Image upload to local disk |
| UserBrowser → NextJsApp | HTTPS | `:3000 /admin/*` | auth:admin | PII, Secrets | Admin dashboard (user/product/order management) |
| NextJsApp → MongoDB | TCP | `:27017` (Atlas) | vpc-only, tls | PII, Tokens, Secrets, Payments | All database operations (user auth, product queries, order storage) |
| NextJsApp → SendGrid | HTTPS | `:443 api.sendgrid.com` | api-key | PII | Email sending (verification, password recovery, order notifications) |
| NextJsApp → InfuraRPC | HTTPS | `:443 mainnet.infura.io` | project-id | Public | Ethereum transaction submission (wallet rewards, payment escrow) |
| NextJsApp → S3Bucket | HTTPS | `:443 s3.amazonaws.com` | aws-credentials | Public | Image upload (product photos) |
| UserBrowser → S3Bucket | HTTPS | `:443 pagineazzurre2.s3.amazonaws.com` | none | Public | Direct image fetch (CDN behavior) |
| UserBrowser → GoogleMaps | HTTPS | `:443 maps.googleapis.com` | api-key | Public | Address autocomplete, geocoding (client-side) |
| UserBrowser → PayPal | HTTPS | `:443 paypal.com` | client-id | Payments | Payment button (client-side checkout) |

---

### 6.4 Guards Directory

| Guard Name | Category | Statement |
|---|---|---|
| **none** | Auth | No authentication or authorization required. Endpoint is publicly accessible. |
| **auth:user** | Auth | Requires valid NextAuth session (JWT in HTTP-only cookie). User must be authenticated with `session.user.id` populated. Enforced by `getServerSession(authOptions)` returning truthy value. |
| **auth:seller** | Authorization | Requires authenticated user with `session.user.isSeller === true` OR `session.user.isAdmin === true`. Sellers can create/manage products and view seller-filtered orders. |
| **auth:admin** | Authorization | Requires authenticated user with `session.user.isAdmin === true`. Admins have full access to user management, order deletion, and all seller privileges. |
| **ownership:user** | ObjectOwnership | Verifies the requesting user's `session.user.id` matches the target object's owner field (e.g., `order.user`, `product.seller`). Prevents horizontal privilege escalation. **CRITICAL:** Many endpoints LACK this guard. |
| **ownership:order-buyer** | ObjectOwnership | Verifies `order.user.toString() === session.user.id`. Only the buyer (order creator) can access the order. |
| **ownership:order-seller** | ObjectOwnership | Verifies `order.seller.toString() === session.user.id`. Only the seller (order fulfiller) can access/update the order. |
| **ownership:product** | ObjectOwnership | Verifies `product.seller.toString() === session.user.id`. Only the product creator can modify/delete the product. **✅ IMPLEMENTED** in product update/delete endpoints. |
| **ownership:profile** | ObjectOwnership | Verifies `req.params.id === session.user.id` for user profile access. Only the user can modify their own profile. **❌ MISSING** in `GET /api/users/[id]` (endpoint is public). |
| **vpc-only** | Network | Communication restricted to Virtual Private Cloud or private network. MongoDB Atlas accessible only via authorized IP ranges (configuration dependent). |
| **tls** | Protocol | All connections use TLS/SSL encryption. MongoDB Atlas enforces TLS 1.2+. HTTPS enforced in production (development uses HTTP on localhost). |
| **api-key** | Auth | Third-party API requires API key for authentication. Used by SendGrid, Google Maps, Infura. Keys stored in environment variables. |
| **project-id** | Auth | Infura RPC requires project ID embedded in URL for request authorization. |
| **aws-credentials** | Auth | AWS S3 access uses IAM credentials (access key ID + secret access key). Credentials stored in environment or IAM role (deployment-dependent). |
| **client-id** | Auth | PayPal client-side SDK requires public client ID. Not sensitive (rate limiting enforced by PayPal). |
| **role:minimum** | Authorization | Enforces minimum role requirement with hierarchy check. Example: Admin role includes seller privileges via `isSeller \|\| isAdmin` logic. **⚠️ Inconsistently applied** - some endpoints check only specific role. |
| **email:verified** | Authorization | Requires `user.verify.verified === true`. Blocks login for unverified accounts (enforced in NextAuth credentials provider). |
| **csrf:token** | Protocol | CSRF protection via NextAuth built-in mechanism (state parameter, PKCE for OAuth). **⚠️ Only applied to `/api/auth/*` routes**, not custom API endpoints. |

---

## 7. Role & Privilege Architecture

### 7.1 Discovered Roles

| Role Name | Privilege Level | Scope/Domain | Code Implementation |
|---|---|---|---|
| **anon** | 0 | Global | No authentication. Can access public endpoints only. |
| **user** | 1 | Global | Base authenticated role. Has `session.user.id` populated. Can create orders, update own profile, add reviews. Checked via `getServerSession()` returning truthy value. |
| **seller** | 2 | Global | `user.isSeller === true` (default for all new users). Can create/manage products. Checked via `session.user.isSeller === true` in middleware or API routes. Implementation: `/middleware.ts:17-21`, API routes check `session.user.isSeller \|\| session.user.isAdmin`. |
| **admin** | 5 | Global | `user.isAdmin === true`. Full application privileges: user management (CRUD), product deletion, order deletion. Checked via `session.user.isAdmin === true`. Implementation: `/middleware.ts:10-14`, API routes check `session.user.isAdmin`. |
| **hasAd** (flag) | N/A | Feature gate | `user.hasAd === true`. Not a role, but a premium feature flag. Users with `hasAd` can access premium advertising features (exact features unclear from code). Self-upgradable via `PUT /api/users/upgrade/[id]`. |
| **verified** (flag) | N/A | Pre-requisite | `user.verify.verified === true`. Email verification status. Required for login (enforced in NextAuth credentials provider). Not used for API authorization (login blocks unverified users). |

**Role Hierarchy (Implicit):**
```
admin (5) > seller (2) > user (1) > anon (0)
          ↓
    hasAd (feature flag, independent)
```

**Note:** Admin does NOT automatically inherit seller privileges unless `isSeller` is also set to `true`. This is inconsistent with typical role hierarchies.

---

### 7.2 Privilege Lattice

```
Privilege Ordering (→ means "has all privileges of"):

anon (public access)
  ↓
user (authenticated, can create orders/reviews)
  ↓
seller (can create/manage products) ← hasAd (premium feature, orthogonal)
  ↓
admin (full system access)
```

**Parallel Isolation:** None identified. All roles are globally scoped (no per-organization or per-team isolation).

**Role Switching Mechanisms:**
- **None implemented.** No impersonation, no "sudo mode", no temporary privilege elevation.
- Admins can modify user roles via `PUT /api/users/[id]`, including their own (potential self-privilege escalation).

**Role Dominance:**
- Admin can perform all seller actions (if `isSeller` flag is also set, which it may not be by default)
- Seller can perform all user actions
- User can perform all anonymous actions

**Feature Flags:**
- `hasAd`: Independent of role hierarchy, users can self-upgrade
- `verify.verified`: Pre-login requirement, not used for post-login authorization

---

### 7.3 Role Entry Points

| Role | Default Landing Page | Accessible Route Patterns | Authentication Method |
|---|---|---|---|
| **anon** | `/` | `/`, `/signin`, `/register`, `/products`, `/products/[id]`, `/sellers`, `/top-sellers`, `/password-recovery`, `/verification/[id]`, `/newsletter` | None |
| **user** | `/` (after login) | All anon routes + `/profile`, `/orderhistory`, `/order/[id]`, `/shipping`, `/payment`, `/placeorder`, `/api/users/profile`, `/api/orders/*`, `/api/uploads` | NextAuth session (JWT cookie) |
| **seller** | `/` (same as user) | All user routes + `/productlist`, `/product/add`, `/product/[id]/edit`, `/api/products` (POST/PUT/DELETE) | NextAuth session + `isSeller: true` in JWT |
| **admin** | `/admin` (dedicated dashboard) | All seller routes + `/admin`, `/admin/users`, `/admin/products`, `/admin/orders`, `/api/users` (GET/PUT/DELETE), `/api/orders/[id]` (DELETE) | NextAuth session + `isAdmin: true` in JWT |

**Frontend Route Protection:**
- **File:** `/middleware.ts:4-55`
- **Admin Routes:** Lines 10-14 check `token?.isAdmin`, redirect to `/` if false
- **Seller Edit Routes:** Lines 17-21 check `token?.isSeller || token?.isAdmin`, redirect to `/` if false
- **Protected Route Matcher:** Lines 58-74 define patterns requiring authentication (profile, orders, admin, uploads)

**API Route Protection:**
- All API routes manually call `getServerSession(authOptions)` and check `session?.user?.id`
- Role checks performed inline (e.g., `if (!session.user.isAdmin) return 401`)
- No centralized authorization middleware (inconsistent implementation)

---

### 7.4 Role-to-Code Mapping

| Role | Middleware/Guards | Permission Checks | Storage Location |
|---|---|---|---|
| **anon** | None | No checks | N/A |
| **user** | `getServerSession()` returns truthy | `if (!session?.user?.id) return 401` | JWT claim: `{ id, email, name, ... }` |
| **seller** | `session.user.isSeller` check | `if (!session.user.isSeller && !session.user.isAdmin) return 401` | JWT claim: `{ isSeller: true, ... }`, DB field: `user.isSeller` |
| **admin** | `session.user.isAdmin` check | `if (!session.user.isAdmin) return 401` | JWT claim: `{ isAdmin: true, ... }`, DB field: `user.isAdmin` |
| **hasAd** | No enforcement found | Likely client-side feature gating | JWT claim: `{ hasAd: true, ... }`, DB field: `user.hasAd` |
| **verified** | Checked in NextAuth provider | `if (!user.verify.verified) throw new Error('Email not verified')` | DB field: `user.verify.verified` (line: `/lib/auth/config.ts:36-40`) |

**Guard Implementation Locations:**
- **NextAuth Config:** `/lib/auth/config.ts:9-50` (credentials provider checks verification)
- **Middleware:** `/middleware.ts:10-14` (admin route protection), lines 17-21 (seller route protection)
- **API Route Pattern (used in 60+ endpoints):**
  ```typescript
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: 'Non autorizzato' }, { status: 401 });
  }
  // Optional role checks:
  if (!session.user.isAdmin) {
    return NextResponse.json({ message: 'Non autorizzato' }, { status: 401 });
  }
  ```

**Storage:**
- **Database (persistent):** MongoDB User model (`/lib/db/models/User.ts:22-30`)
- **JWT Claims (session):** Generated in `/lib/auth/config.ts:98-110`, expires after 30 days
- **Client Session:** Exposed to frontend via `/lib/auth/config.ts:136-149`, accessible via `useSession()`

---

## 8. Authorization Vulnerability Candidates

**This section identifies specific endpoints and patterns that are prime candidates for authorization testing, organized by vulnerability type.**

### 8.1 Horizontal Privilege Escalation Candidates

**Ranked list of endpoints with object identifiers that could allow access to other users' resources.**

| Priority | Endpoint Pattern | Object ID Parameter | Data Type | Sensitivity | Vulnerability Details |
|---|---|---|---|---|---|
| **CRITICAL** | `GET /api/orders/[id]` | `id` (order ObjectId) | order_data | **HIGH** - Exposes buyer PII (shipping address, phone, email), order contents, payment status | **❌ NO OWNERSHIP CHECK.** Any authenticated user can view any order by enumerating ObjectIDs. File: `orders/[id]/route.ts:12-41`. Expected fix: Validate `order.user === session.user.id OR order.seller === session.user.id OR session.user.isAdmin`. |
| **HIGH** | `GET /api/users/[id]` | `id` (user ObjectId) | user_data | **HIGH** - Exposes email, phone, fiscal code (CF), partita IVA, wallet address | **❌ NO AUTHENTICATION REQUIRED.** Endpoint is completely public. File: `users/[id]/route.ts:13-43`. Expected fix: Require authentication, return limited public profile for non-owners, full profile only for self or admin. |
| **MEDIUM** | `PUT /api/users/upgrade/[id]` | `id` (user ObjectId) | privilege | **MEDIUM** - Sets `hasAd` premium flag | **⚠️ BUG: Ignores `id` parameter.** Endpoint accepts `id` in URL but always upgrades `session.user.id`. Potential future vulnerability if code changes. File: `users/upgrade/[id]/route.ts:12-66`. Expected fix: Remove `id` parameter or validate `id === session.user.id`. |
| **LOW** | `GET /api/orders` (seller filter) | `seller` (query param) | order_data | **MEDIUM** - Sellers can view other sellers' orders | **❌ FILTER NOT ENFORCED.** Non-admin sellers can set `?seller=<any_id>` or omit it to view all orders. File: `orders/route.ts:30-34`. Expected fix: Force `sellerFilter = { seller: session.user.id }` for non-admin sellers. |

**Detailed Attack Scenario - CRITICAL Example:**

**Vulnerability:** `GET /api/orders/[id]` - Order IDOR

**Attack Steps:**
1. Attacker creates account, logs in (obtains valid session)
2. Attacker creates one order, notes the ObjectId format: `67a1b2c3d4e5f6789012345`
3. Attacker enumerates order IDs by incrementing/decrementing hex values or using common patterns
4. For each guessed ID, attacker sends: `GET /api/orders/67a1b2c3d4e5f6789012346`
5. **Result:** Attacker receives full order details for other users:
   ```json
   {
     "shippingAddress": {
       "fullName": "Mario Rossi",
       "address": "Via Roma 123",
       "city": "Milano",
       "postalCode": "20100",
       "phone": "+39 333 1234567"
     },
     "orderItems": [...],
     "user": "507f1f77bcf86cd799439011",
     "seller": "507f191e810c19729de860ea",
     "totalPriceEuro": 49.99,
     "isPaid": true,
     "paidAt": "2024-01-15T10:30:00.000Z"
   }
   ```

**Data Exposure:**
- Full name and shipping address (GDPR violation)
- Phone number (GDPR violation)
- Order contents and pricing
- User and seller ObjectIDs (further enumeration)

**Remediation:**
```typescript
// File: /app/api/orders/[id]/route.ts
const order = await OrderModel.findById(id);
if (!order) {
  return NextResponse.json({ message: 'Ordine non trovato' }, { status: 404 });
}

// ✅ ADD OWNERSHIP VALIDATION
const isOwner = order.user.toString() === session.user.id;
const isSeller = order.seller?.toString() === session.user.id;
const isAdmin = session.user.isAdmin;

if (!isOwner && !isSeller && !isAdmin) {
  return NextResponse.json({ message: 'Non autorizzato' }, { status: 403 });
}

return NextResponse.json(order);
```

---

### 8.2 Vertical Privilege Escalation Candidates

**List endpoints that require higher privileges, organized by target role.**

#### Admin Endpoints (Target: `isAdmin` flag)

| Priority | Endpoint Pattern | Functionality | Risk Level | Vulnerability Details |
|---|---|---|---|---|
| **HIGH** | `PUT /api/users/[id]` | User role modification | **CRITICAL** | Admins can modify user roles including `isAdmin`, `isSeller`. **❌ NO SELF-MODIFICATION CHECK.** Admin can grant additional privileges to themselves or compromised accounts. File: `users/[id]/route.ts:46-84`. |
| **HIGH** | `DELETE /api/users/[id]` | User deletion | **HIGH** | Admin-only deletion. Protects `admin@example.com` but not other admins. File: `users/[id]/route.ts:87-126`. |
| **HIGH** | `GET /api/users` | User list (all users) | **MEDIUM** | Returns all user data (sanitized via `toJSON()`). Admin only. File: `users/route.ts:13-33`. |
| **MEDIUM** | `DELETE /api/orders/[id]` | Order deletion | **MEDIUM** | Admin can delete any order. No audit trail. File: `orders/[id]/route.ts:44-77`. |

#### Seller Endpoints (Target: `isSeller` flag or hasAd)

| Priority | Endpoint Pattern | Functionality | Risk Level | Vulnerability Details |
|---|---|---|---|---|
| **LOW** | `POST /api/products` | Product creation | **LOW** | Requires `isSeller` or `isAdmin`. All users have `isSeller: true` by default, so no meaningful escalation. File: `products/route.ts:121-185`. |
| **LOW** | `PUT /api/users/upgrade/[id]` | Set `hasAd` flag | **LOW** | Any authenticated user can self-upgrade to `hasAd: true`. No privilege escalation (intended self-service). File: `users/upgrade/[id]/route.ts:12-66`. |

**Note:** All seller endpoints check `isSeller || isAdmin`, so there's no vertical escalation opportunity since `isSeller` defaults to `true` for all users. The only meaningful vertical escalation target is the **admin role** via `PUT /api/users/[id]`.

**Attack Scenario - Admin Self-Privilege Grant:**

**Vulnerability:** `PUT /api/users/[id]` allows admin to modify own privileges

**Attack Steps:**
1. Attacker compromises an admin account (via phishing, credential stuffing, etc.)
2. Admin account has `isAdmin: true` but might have limited database access or other restrictions
3. Attacker calls: `PUT /api/users/<admin_user_id>` with body:
   ```json
   {
     "isAdmin": true,
     "isSeller": true,
     "email": "attacker@evil.com"
   }
   ```
4. **Result:** Attacker grants themselves seller privileges (if missing) and changes email to maintain access
5. **Persistence:** Attacker can create additional admin accounts by calling the same endpoint with different user IDs

**Remediation:**
```typescript
// File: /app/api/users/[id]/route.ts:46-84
const user = await UserModel.findById(id);
if (!user) {
  return NextResponse.json({ message: 'Utente non trovato' }, { status: 404 });
}

// ✅ ADD SELF-MODIFICATION CHECK
if (user._id.toString() === session.user.id) {
  // Prevent admins from modifying their own roles
  return NextResponse.json({ 
    message: 'Non puoi modificare i tuoi privilegi' 
  }, { status: 403 });
}

// Proceed with update
user.name = body.name || user.name;
user.email = body.email || user.email;
user.isSeller = body.isSeller !== undefined ? Boolean(body.isSeller) : user.isSeller;
user.isAdmin = body.isAdmin !== undefined ? Boolean(body.isAdmin) : user.isAdmin;
```

---

### 8.3 Context-Based Authorization Candidates

**Multi-step workflow endpoints that assume prior steps were completed.**

| Workflow | Endpoint | Expected Prior State | Bypass Potential | Vulnerability Details |
|---|---|---|---|---|
| **Order Checkout** | `PUT /api/orders/[id]/pay` | Order created, unpaid | **MEDIUM** | Assumes order exists and belongs to user. **✅ SECURE:** Ownership check implemented (`order.user === session.user.id OR admin`). File: `orders/[id]/pay/route.ts:37-44`. |
| **Order Fulfillment** | `PUT /api/orders/[id]/deliver` | Order paid, not delivered | **MEDIUM** | Assumes order is paid. **✅ SECURE:** Business logic check `if (!order.isPaid)` (line 50-55) + ownership check (`order.seller === session.user.id OR admin`). File: `orders/[id]/deliver/route.ts:37-44, 50-55`. |
| **Email Verification** | `POST /api/users/verification/[id]` | Registration completed, unverified | **LOW** | Assumes user exists with matching `trusted_link`. **✅ SECURE:** One-time token prevents reuse (`findOneAndUpdate` with `verified: false` condition). File: `verification/[id]/route.ts:45-58`. |
| **Password Reset** | `POST /api/users/password-replacement` | Password recovery initiated | **LOW** | Assumes `recoveryPasswordId` matches. **✅ SECURE:** Token auto-invalidates when password changes (keccak256 hash of old password). File: `password-replacement/route.ts:27-29, 38-41`. |
| **Product Review** | `POST /api/products/[id]/reviews` | User purchased product (assumed) | **MEDIUM** | **❌ NO PURCHASE CHECK.** Any authenticated user can review any product without verifying purchase. File: `products/[id]/reviews/route.ts:12-87`. |

**Detailed Attack Scenario - Review Spam:**

**Vulnerability:** `POST /api/products/[id]/reviews` - No purchase verification

**Attack Steps:**
1. Attacker creates account, logs in
2. Attacker identifies competitor's product ID: `67a1b2c3d4e5f6789012345`
3. Attacker sends multiple review requests:
   ```bash
   for i in {1..100}; do
     curl -X POST http://localhost:3000/api/products/67a1b2c3d4e5f6789012345/reviews \
       -H "Authorization: Bearer <JWT>" \
       -H "Content-Type: application/json" \
       -d '{"rating": 1, "comment": "Terrible product!", "name": "Fake User '$i'"}'
   done
   ```
4. **Result:** Competitor's product rating bombed to 1 star
5. **Impact:** Business disruption, reputation damage

**Current Mitigations:**
- **⚠️ WEAK:** Comment sanitized in emails (`escapeHtml()` in `mailMsg.js:2-10`), but not validated for length or content
- **❌ MISSING:** No duplicate review check per user
- **❌ MISSING:** No purchase verification

**Remediation:**
```typescript
// File: /app/api/products/[id]/reviews/route.ts
const product = await ProductModel.findById(id);

// ✅ ADD DUPLICATE REVIEW CHECK
const existingReview = product.reviews.find(
  (review) => review.user?.toString() === session.user.id
);
if (existingReview) {
  return NextResponse.json({ 
    message: 'Hai già recensito questo prodotto' 
  }, { status: 400 });
}

// ✅ ADD PURCHASE VERIFICATION (optional, business logic dependent)
const hasPurchased = await OrderModel.findOne({
  user: session.user.id,
  'orderItems.product': id,
  isPaid: true,
});
if (!hasPurchased) {
  return NextResponse.json({ 
    message: 'Devi acquistare il prodotto prima di recensirlo' 
  }, { status: 403 });
}

// Proceed with review creation
```

---

## 9. Injection Sources

**TASK AGENT COORDINATION:** Injection source analysis performed by dedicated Task agent. Results synthesized below.

**Network Surface Focus:** Only injection sources accessible through the Next.js API routes at `http://localhost:3000`. Local-only scripts, build tools, and CLI utilities excluded.

### 9.1 NoSQL/MongoDB Injection Sources (13 vulnerabilities)

| Priority | Injection Type | Endpoint | Input Vector | Dangerous Sink | File:Line | Severity Rationale |
|---|---|---|---|---|---|---|
| **CRITICAL** | NoSQL Injection | POST /api/users/password-recovery | `req.body.email` | `UserModel.findOne({ email })` | `password-recovery/route.ts:12-16` | Unauthenticated endpoint. Attacker can inject `{ $ne: null }` to return all users, triggering password reset emails for arbitrary accounts. |
| **CRITICAL** | NoSQL Injection | POST /api/users/password-replacement | `req.body.id` | `UserModel.findOne({ recoveryPasswordId: id })` | `password-replacement/route.ts:27-29` | Unauthenticated endpoint. Attacker can inject `{ $ne: null }` to reset passwords for arbitrary users. |
| **CRITICAL** | NoSQL Injection | POST /api/users/verification/[id] | `req.body.uuid` | `UserModel.findOneAndUpdate({ 'verify.trusted_link': uuid })` | `verification/[id]/route.ts:45-58` | Unauthenticated endpoint. Attacker can inject objects to bypass verification. Mitigated by atomic `findOneAndUpdate` with `verified: false` condition. |
| **HIGH** | NoSQL Injection | POST /api/users/newsletter | `req.body.email` | `NewsletterModel.findOne({ email })` | Inferred from pre-recon: `userRouter.js:469` | Unauthenticated endpoint. Allows querying newsletter database with arbitrary operators. |
| **HIGH** | NoSQL Injection | POST /api/users/newsletter/verify | `req.body.email` | `NewsletterModel.find({ email })` | Inferred from pre-recon: `userRouter.js:500` | Unauthenticated endpoint. Similar to above. |
| **HIGH** | NoSQL Injection | POST /api/users/newsletter/update | `req.body.email` | `NewsletterModel.find({ email })` | Inferred from pre-recon: `userRouter.js:519` | Unauthenticated endpoint. Similar to above. |
| **HIGH** | NoSQL Injection | GET /api/orders | `req.query.seller` | `OrderModel.find({ seller })` | `orders/route.ts:30-34` | Authenticated (seller/admin). Attacker can inject `{ $ne: null }` to view all orders. |
| **HIGH** | ReDoS + NoSQL Injection | GET /api/products | `req.query.name` | `{ name: { $regex: name, $options: 'i' } }` | `products/route.ts:48` | **Unauthenticated.** User input directly in `$regex` without escaping. Allows: (1) ReDoS attack via `(a+)+b`, (2) Data exfiltration via `.*`, (3) Regex injection with special characters. |
| **MEDIUM** | NoSQL Injection | GET /api/users/[id] | `req.params.id` | `UserModel.findById(id)` | `users/[id]/route.ts:25` | **Public endpoint.** Mongoose casts to ObjectId (prevents most injection), but invalid IDs cause errors. |
| **MEDIUM** | NoSQL Injection | GET /api/orders/[id] | `req.params.id` | `OrderModel.findById(id)` | `orders/[id]/route.ts:25-26` | Authenticated. Mongoose ObjectId casting limits injection, but IDOR vulnerability is more critical. |
| **MEDIUM** | NoSQL Injection | GET /api/products/[id] | `req.params.id` | `ProductModel.findById(id)` | `products/[id]/route.ts:20` | Public endpoint. Mongoose ObjectId casting limits injection. |
| **MEDIUM** | NoSQL Injection | DELETE /api/users/[id] | `req.params.id` | `UserModel.findById(id)` | `users/[id]/route.ts:99` | Admin-only. Mongoose ObjectId casting limits injection. |
| **MEDIUM** | NoSQL Injection | PUT /api/users/[id] | `req.params.id` | `UserModel.findById(id)` | `users/[id]/route.ts:58` | Admin-only. Mongoose ObjectId casting limits injection. |

**Detailed Flow - CRITICAL Example:**

**Vulnerability:** POST `/api/users/password-recovery` - NoSQL Injection

**Flow Path:**
```
UserBrowser → HTTP POST /api/users/password-recovery
           ↓ 
  req.body = { "email": { "$ne": null } }  ← ATTACKER PAYLOAD
           ↓
  File: password-recovery/route.ts:12-16
           ↓
  const { email } = await request.json();  ← No validation
           ↓
  const user = await UserModel.findOne({ email });  ← INJECTION POINT
           ↓
  MongoDB query: db.users.findOne({ email: { $ne: null } })
           ↓
  Returns first user in database (likely admin)
           ↓
  Generates password recovery token for that user
           ↓
  Sends password reset email to victim
```

**Attack Payload:**
```json
{
  "email": { "$ne": null }
}
```

**Result:** Attacker triggers password reset for the first user in the database (often an admin account).

**Remediation:**
```typescript
// File: /app/api/users/password-recovery/route.ts
const { email } = await request.json();

// ✅ ADD TYPE VALIDATION
if (typeof email !== 'string' || !email) {
  return NextResponse.json({ message: 'Email non valida' }, { status: 400 });
}

// ✅ ADD EMAIL FORMAT VALIDATION
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!emailRegex.test(email)) {
  return NextResponse.json({ message: 'Formato email non valido' }, { status: 400 });
}

const user = await UserModel.findOne({ email: email.toLowerCase() });
```

---

### 9.2 Path Traversal / File Inclusion Sources (1 vulnerability)

| Priority | Injection Type | Endpoint | Input Vector | Dangerous Sink | File:Line | Severity Rationale |
|---|---|---|---|---|---|---|
| **MEDIUM** | Path Traversal | POST /api/uploads (inferred) | `file.originalname` | S3 bucket key: `key(req, file, cb) { cb(null, file.originalname) }` | Inferred from pre-recon: `uploadRouter.js:39` | Authenticated endpoint. User controls S3 object key via filename. Allows: (1) Path traversal (`../../etc/passwd`), (2) XSS in filename, (3) DoS via long filenames. **Note:** Local upload uses `Date.now().jpg` (secure). |

**Detailed Flow:**

**Flow Path:**
```
UserBrowser → HTTP POST /api/uploads (multipart/form-data)
           ↓
  file.originalname = "../../../malicious.jpg"  ← ATTACKER PAYLOAD
           ↓
  Multer middleware processes upload
           ↓
  File: uploadRouter.js:39 (inferred from pre-recon)
           ↓
  storageS3 = multerS3({
    key(req, file, cb) {
      cb(null, file.originalname)  ← INJECTION POINT
    }
  })
           ↓
  S3 object created with key: "../../../malicious.jpg"
           ↓
  S3 bucket: pagineazzurre2
           ↓
  File stored with attacker-controlled path
```

**Attack Payloads:**
- Path traversal: `../../../etc/passwd` (S3 may normalize, but creates confusing object keys)
- XSS in filename: `<script>alert(1)</script>.jpg` (if filename displayed without sanitization)
- DoS: Very long filename (e.g., 10,000 characters)

**Remediation:**
```typescript
// File: /app/api/uploads/route.ts (or equivalent)
const storageS3 = multerS3({
  s3,
  bucket: 'pagineazzurre2',
  acl: 'public-read',
  contentType: multerS3.AUTO_CONTENT_TYPE,
  key(req, file, cb) {
    // ✅ SANITIZE FILENAME
    const timestamp = Date.now();
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    
    if (!allowedExtensions.includes(ext)) {
      return cb(new Error('Tipo di file non consentito'));
    }
    
    const safeFilename = `${timestamp}${ext}`;
    cb(null, safeFilename);
  }
});
```

---

### 9.3 Server-Side Template Injection (SSTI) Sources

**Status:** **NONE FOUND**

**Analysis:**
- No template engines (EJS, Pug, Handlebars) used in API routes
- Email templates use string concatenation with HTML escaping (`escapeHtml()` function in `mailMsg.js:2-10`)
- All email fields properly sanitized before embedding in HTML

**Email Sanitization (✅ SECURE):**
```typescript
// File: mailMsg.js:2-10 (inferred from pre-recon)
const escapeHtml = (unsafe) => {
  if (typeof unsafe !== 'string') return unsafe;
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};
```

---

### 9.4 Command Injection Sources

**Status:** **NONE FOUND**

**Analysis:**
- No use of `exec()`, `execSync()`, `spawn()`, or `child_process` module in network-accessible code paths
- Blockchain operations use `viem` library (safe, no shell execution)
- File operations use `multer` and `fs` (no shell commands)

---

### 9.5 Insecure Deserialization Sources

**Status:** **NONE FOUND (low risk)**

**Analysis:**
- Only `JSON.parse()` used (implicit in Express.js `express.json()` middleware)
- `JSON.parse()` has minimal security risk (prototype pollution only in specific contexts)
- No use of `eval()`, `Function()`, `vm.runInContext()`, or YAML parsers

---

### 9.6 Mass Assignment Vulnerabilities (2 findings)

| Priority | Endpoint | Input Vector | Dangerous Fields | File:Line | Severity Rationale |
|---|---|---|---|---|---|
| **HIGH** | PUT /api/users/profile | `req.body.*` | All user fields accepted without whitelist | `users/profile/route.ts:75-100` | Authenticated endpoint. No field whitelist. Potential to modify sensitive fields if validation is incomplete. |
| **CRITICAL** | PUT /api/users/[id] (admin) | `req.body.*` | `isAdmin`, `isSeller` flags | `users/[id]/route.ts:58-74` | Admin endpoint. Allows modifying user roles. **No self-modification check** - admin can grant themselves additional privileges. |

**Detailed Flow - Mass Assignment:**

**Endpoint:** PUT `/api/users/profile`

**Flow Path:**
```
UserBrowser → HTTP PUT /api/users/profile
           ↓
  req.body = {
    "name": "Attacker",
    "isAdmin": true,  ← ATTACKER PAYLOAD (attempt to escalate privileges)
    "account": "0x..." ← ATTACKER PAYLOAD (attempt to hijack wallet)
  }
           ↓
  File: users/profile/route.ts:75-100
           ↓
  user.name = body.name || user.name;  ← Direct assignment
  user.account = body.account || user.account;  ← ❌ DANGEROUS if allowed
  user.isAdmin = body.isAdmin || user.isAdmin;  ← ❌ PRIVILEGE ESCALATION if not filtered
           ↓
  user.save();
```

**Current Protection (partial):**
- JWT claims (`isAdmin`, `isSeller`) are **NOT** updated in profile endpoint (only in admin endpoint)
- Mongoose schema may reject unknown fields (depends on `strict` mode)
- Some fields like `password`, `accountKey` excluded from update logic

**Remediation:**
```typescript
// File: /app/api/users/profile/route.ts
const allowedFields = [
  'name', 'surname', 'birthday', 'birthplace', 'gender',
  'cf', 'phone', 'city', 'zipCode', 'partitaIva',
  'sellerName', 'sellerDescription'
];

// ✅ WHITELIST APPROACH
for (const field of allowedFields) {
  if (body[field] !== undefined) {
    user[field] = body[field];
  }
}

// ❌ DO NOT ALLOW: isAdmin, isSeller, account, accountKey, password
```

---

### 9.7 Summary of Injection Sources

**Total Vulnerabilities:** 17

**By Severity:**
- **CRITICAL:** 3 (NoSQL injection in auth endpoints)
- **HIGH:** 5 (NoSQL injection in public/seller endpoints, ReDoS)
- **MEDIUM:** 9 (ObjectId injection, path traversal, mass assignment)

**By Type:**
- **NoSQL Injection:** 13
- **Path Traversal:** 1
- **Mass Assignment:** 2
- **ReDoS:** 1 (counted under NoSQL injection)
- **SSTI:** 0
- **Command Injection:** 0
- **Deserialization:** 0

**Mitigation Priority:**
1. **Immediate:** Fix CRITICAL NoSQL injection in password recovery/replacement (unauthenticated, high impact)
2. **High:** Fix product search ReDoS (public, DoS risk)
3. **High:** Fix newsletter NoSQL injection (unauthenticated, data exposure)
4. **Medium:** Add input validation to all endpoints (defense in depth)
5. **Medium:** Sanitize S3 upload filenames
6. **Low:** Review mass assignment attack surface (lower risk due to JWT validation)

---

## 10. Additional Security Findings

### 10.1 Sensitive Data Exposure

**Private Keys Stored in Database (CRITICAL):**
- **Field:** `user.accountKey` (Ethereum private key)
- **Storage:** Plaintext in MongoDB
- **File:** `/lib/db/models/User.ts:17`
- **Impact:** Database breach = complete financial loss for all users
- **Mitigation:** Private keys filtered from API responses via `toJSON()` (line 110-117), but still vulnerable to database compromise
- **Recommendation:** Use encryption at rest (AES-256-GCM with KMS), or migrate to non-custodial wallet (MetaMask integration)

**Password Hashing (WEAK):**
- **Algorithm:** bcryptjs
- **Salt Rounds:** 8 (WEAK - should be 10-12)
- **File:** `/app/api/users/register/route.ts:23`
- **Recommendation:** Increase to 12 salt rounds for new passwords, rehash on login

**Secrets in Environment Variables (PARTIAL):**
- **Good:** API keys, database URLs in `.env` (not hardcoded)
- **Bad:** Production secrets may be committed to repository (not verified)
- **File:** `.env`, `.env.local`
- **Recommendation:** Use secret management service (AWS Secrets Manager, HashiCorp Vault)

---

### 10.2 Authentication Security

**JWT Expiration Too Long:**
- **Duration:** 30 days
- **File:** `/lib/auth/config.ts:153`
- **Impact:** Stolen tokens valid for extended period, no revocation mechanism
- **Recommendation:** Reduce to 7 days, implement refresh tokens, add token blacklist

**No CSRF Protection (API Routes):**
- **Status:** NextAuth has built-in CSRF for `/api/auth/*` routes only
- **Gap:** Custom API endpoints (`/api/users/*`, `/api/products/*`, etc.) lack CSRF tokens
- **Impact:** State-changing requests vulnerable to CSRF if SameSite cookies not enforced
- **Mitigation:** SameSite=lax cookie attribute (NextAuth default) provides partial protection
- **Recommendation:** Add CSRF tokens for critical operations (password change, role modification)

**No Rate Limiting:**
- **Endpoints:** All endpoints lack rate limiting
- **Impact:** Brute force attacks on login, password recovery spam, API abuse
- **Recommendation:** Implement rate limiting middleware (e.g., `express-rate-limit` or Next.js middleware)

**Email Enumeration:**
- **Endpoint:** POST `/api/users/password-recovery`
- **Behavior:** Different responses for existing/non-existing emails (likely, not verified from code)
- **Impact:** Attackers can enumerate valid email addresses
- **Recommendation:** Return generic success message regardless of email existence

---

### 10.3 Input Validation Gaps

**Missing Server-Side Validation:**
- **Registration:** No validation of `username`, `email`, `password`, `organizations` array
- **Product Review:** No validation of `comment` length or content
- **Order Shipping:** No validation of `lat`, `lng` coordinates
- **Newsletter:** No validation of `email`, `name` fields

**Validation Implementation:**
- **Status:** `express-validator` library present but **NOT USED** in most endpoints
- **Gap:** Validation middleware defined in `validators.js` (inferred from pre-recon) but not applied to API routes
- **Recommendation:** Apply validation middleware to all POST/PUT endpoints

**File Upload Validation:**
- **Missing:** File type validation, size limits, virus scanning
- **Current:** Local upload uses `Date.now().jpg` (filename sanitized), S3 upload uses `file.originalname` (vulnerable)
- **Recommendation:** Whitelist allowed MIME types, enforce max file size (e.g., 5MB), scan for malware

---

### 10.4 GDPR Compliance Gaps

**Data Minimization:**
- **Issue:** Fields like `birthday`, `birthplace`, `gender` collected but purpose unclear
- **Recommendation:** Remove unnecessary fields or justify collection in privacy policy

**Right to Erasure:**
- **Status:** Admin can delete users via `DELETE /api/users/[id]`
- **Gap:** No self-service account deletion, no data export (portability)
- **Recommendation:** Implement user-initiated account deletion, data export API

**Consent Mechanisms:**
- **Newsletter:** ✅ Separate opt-in with verification
- **Terms of Service:** ❌ No consent checkbox during registration
- **Recommendation:** Add ToS/Privacy Policy acceptance during registration

**Data Retention:**
- **Policy:** None documented
- **Recommendation:** Define retention periods, auto-delete inactive accounts (GDPR compliance)

---

## 11. Technology-Specific Vulnerabilities

### 11.1 Next.js / React

**Client-Side State Exposure:**
- Session data exposed to client via `useSession()` hook
- Sensitive fields excluded via session callback (line `/lib/auth/config.ts:136-149`)
- **Risk:** Low (sensitive data filtered)

**API Route Security:**
- No centralized authorization middleware
- Each route manually checks `getServerSession()`
- **Risk:** HIGH - Inconsistent implementation, easy to forget checks
- **Recommendation:** Create reusable authorization middleware

---

### 11.2 MongoDB / Mongoose

**Query Operator Injection:**
- All NoSQL injection vulnerabilities stem from accepting objects in query parameters
- **Root Cause:** Express.js parses JSON bodies, allowing `{ "$ne": null }` payloads
- **Mitigation:** Type validation (`typeof field === 'string'`)

**Mongoose Schema Validation:**
- **Status:** Schema-level validation exists (required fields, enums)
- **Gap:** Not enforced in all endpoints (mass assignment bypasses)
- **Recommendation:** Enable `strict` mode, validate types before queries

---

### 11.3 Blockchain / Web3

**Private Key Management (CRITICAL):**
- **Issue:** Private keys stored in plaintext database
- **Risk:** Database compromise = wallet theft
- **Recommendation:** Encrypt keys at rest, migrate to non-custodial wallet

**Transaction Security:**
- **Gas Fees:** Hardcoded gas limits (potential DoS if network congested)
- **Nonce Management:** Not analyzed (potential transaction replay)

---

## 12. Exploitation Roadmap for Subsequent Specialists

**This section provides guidance for the five subsequent analysis specialists.**

### 12.1 For Injection Analysis Specialist

**Priority Targets:**
1. **Password Recovery NoSQL Injection** (CRITICAL) - `POST /api/users/password-recovery`
   - Test payload: `{ "email": { "$ne": null } }`
   - Expected result: Password reset triggered for first user in database
   
2. **Product Search ReDoS** (HIGH) - `GET /api/products?name=(a+)+b`
   - Test payload: `?name=(a+)+`
   - Expected result: CPU spike, request timeout
   
3. **S3 Upload Path Traversal** (MEDIUM) - `POST /api/uploads`
   - Test payload: Upload file with name `../../../malicious.jpg`
   - Expected result: S3 object created with traversal path

**Testing Methodology:**
- Use Burp Suite to intercept requests
- Modify JSON bodies to include MongoDB operators (`$ne`, `$gt`, `$regex`)
- Monitor response times for ReDoS attacks
- Check S3 bucket for uploaded files

---

### 12.2 For XSS Analysis Specialist

**Priority Targets:**
1. **Product Description** - Stored XSS via `POST /api/products`
   - Input: `description` field
   - Render context: Product detail page `/products/[id]`
   - Validation: None identified
   - Test payload: `<script>alert(document.domain)</script>`

2. **Review Comments** - Stored XSS via `POST /api/products/[id]/reviews`
   - Input: `comment` field
   - Render context: Product detail page (reviews section)
   - Validation: HTML escaping in emails, but unclear if escaped on frontend
   - Test payload: `<img src=x onerror=alert(1)>`

3. **User Profile Fields** - Reflected/Stored XSS via `PUT /api/users/profile`
   - Input: `seller.description`, `name`, `surname`
   - Render context: Seller profile page, product listings
   - Validation: None identified
   - Test payload: `<svg onload=alert(1)>`

**Note:** Email templates use `escapeHtml()` function (safe), but frontend React rendering needs analysis.

---

### 12.3 For Auth Analysis Specialist

**Priority Targets:**
1. **JWT Security:**
   - Token expiration: 30 days (too long)
   - Secret management: `NEXTAUTH_SECRET` in environment
   - Algorithm: HS256 (symmetric, potential key brute force if weak)
   - Test: Attempt to forge JWT, check for secret leakage

2. **Password Recovery Flow:**
   - Token generation: `keccak256(passwordHash)` (clever, auto-invalidates)
   - Token storage: `user.recoveryPasswordId`
   - Test: Attempt token reuse, check expiration

3. **Email Verification Flow:**
   - One-time token: `loginToken` (UUID v4)
   - Atomic consumption: `findOneAndUpdate` with `$unset`
   - Test: Attempt token reuse, race condition testing

4. **Custom Signin Endpoint:**
   - Status: DEPRECATED (returns user data without creating session)
   - Test: Confirm endpoint is unused, recommend removal

**Session Management:**
- Cookie attributes: `httpOnly=true, secure=true (production), sameSite=lax`
- Session duration: 30 days
- Logout: Client-side `signOut()` (no server-side blacklist)
- Test: Session fixation, cookie theft, CSRF

---

### 12.4 For SSRF Analysis Specialist

**Priority Targets:**
1. **Blockchain RPC Calls:**
   - Endpoint: Infura RPC (not user-controlled)
   - Risk: LOW (URL hardcoded in environment)
   - Test: Attempt to modify RPC URL via request tampering

2. **Email Sending:**
   - Service: SendGrid API (not user-controlled)
   - Risk: LOW (API key in environment, no user-controlled URLs)

3. **File Upload (S3):**
   - Service: AWS S3 (bucket name hardcoded)
   - Risk: LOW (no user-controlled URLs)

4. **Webhook/Callback Endpoints:**
   - Status: None identified
   - Recommendation: Check for any callback URL parameters in order/payment flows

**Note:** SSRF attack surface appears minimal. Focus on finding hidden callback parameters.

---

### 12.5 For Authz Analysis Specialist

**Priority Targets (Detailed in Section 8):**

**Horizontal Privilege Escalation:**
1. **GET /api/orders/[id]** (CRITICAL) - No ownership check
2. **GET /api/users/[id]** (HIGH) - Public access to PII
3. **GET /api/orders** (MEDIUM) - Seller filter not enforced

**Vertical Privilege Escalation:**
1. **PUT /api/users/[id]** (HIGH) - Admin can modify own privileges
2. **DELETE /api/users/[id]** (MEDIUM) - Admin deletion (no self-check)

**Context-Based:**
1. **POST /api/products/[id]/reviews** (MEDIUM) - No purchase verification

**Testing Methodology:**
1. Create two user accounts (User A, User B)
2. User A creates order, notes order ID
3. User B attempts to access User A's order via `GET /api/orders/[order_id]`
4. Expected result: **VULNERABLE** - User B receives full order details
5. Repeat for products, user profiles
6. Test admin privilege escalation by modifying own user record
7. Test review spam by submitting reviews without purchase

---

## 13. Conclusion

**Pagine Azzurre is a feature-rich e-commerce platform with significant security vulnerabilities across all OWASP Top 10 categories.** The most critical findings include:

**CRITICAL RISKS:**
1. **Horizontal Privilege Escalation** - Order IDOR exposes customer PII (shipping addresses, phone numbers)
2. **NoSQL Injection** - Unauthenticated password recovery bypass allows account takeover
3. **Private Key Storage** - Blockchain wallets stored in plaintext (complete financial loss risk)

**HIGH RISKS:**
4. **Public User Data Exposure** - No authentication on user profile endpoint
5. **Vertical Privilege Escalation** - Admin self-privilege grant
6. **ReDoS Vulnerability** - Product search denial of service

**Attack Surface Summary:**
- **60+ API endpoints** (40% lack proper authorization)
- **17 injection vulnerabilities** (3 critical, 5 high)
- **5 IDOR vulnerabilities** (2 critical, 3 high)
- **0 SSTI/Command Injection** (low risk)

**Recommended Immediate Actions:**
1. Add ownership validation to all object-level endpoints (orders, users)
2. Fix NoSQL injection in password recovery/replacement
3. Add input validation to all POST/PUT endpoints
4. Encrypt private keys at rest or migrate to non-custodial wallet
5. Reduce JWT expiration to 7 days, implement refresh tokens
6. Add rate limiting to prevent brute force and DoS attacks

**This reconnaissance provides a comprehensive attack surface map for the five subsequent analysis specialists (Injection, XSS, Auth, SSRF, Authz) to perform targeted vulnerability analysis and exploitation.**

---

**RECONNAISSANCE COMPLETE**