# Authentication Security Analysis Report

## Executive Summary

This report details critical authentication security vulnerabilities found in the Pagine Azzurre application. Multiple user enumeration vulnerabilities, timing side-channels, and logic flaws were identified across authentication endpoints that could allow attackers to enumerate valid users, bypass security measures, and compromise accounts.

---

## 1. USER ENUMERATION VULNERABILITIES

### 1.1 Password Recovery Endpoint - CRITICAL User Enumeration

**Location:** `/nextjs/src/app/api/users/password-recovery/route.ts`

**Vulnerability:**
The password recovery endpoint explicitly reveals whether an email exists in the database through different HTTP status codes and error messages.

**Evidence:**
```typescript
// Lines 22-28 - Explicit user existence disclosure
const user = await UserModel.findOne({ email: email.toLowerCase() });

if (!user) {
  return NextResponse.json(
    { message: 'Email non trovata' },  // "Email not found"
    { status: 404 }
  );
}
```

**Attack Scenario:**
1. Attacker sends POST request to `/api/users/password-recovery` with email `test@example.com`
2. If email doesn't exist: receives 404 status with "Email non trovata"
3. If email exists: receives 200 status with `{ email: true, loading: false }`
4. Attacker can enumerate all valid emails in the database

**Impact:** HIGH
- Attackers can enumerate all registered users
- Different status codes (404 vs 200) make automation trivial
- Can be used to build target lists for phishing attacks
- Violates user privacy

**Recommendation:**
Return the same success message regardless of whether the email exists:
```typescript
// Always return success, never reveal if email exists
return NextResponse.json({
  message: 'Se l\'email è registrata, riceverai un link di recupero',
  success: true
});
```

---

### 1.2 Registration Endpoint - Multiple Enumeration Vectors

**Location:** `/nextjs/src/app/api/users/register/route.ts`

**Vulnerabilities:**
The registration endpoint leaks information about existing users through three distinct error messages.

**Evidence:**

**Email Enumeration (Lines 44-49):**
```typescript
const existingEmail = await UserModel.findOne({ email: email.toLowerCase() });
if (existingEmail) {
  return NextResponse.json(
    { message: 'Indirizzo email già in uso' },  // "Email already in use"
    { status: 400 }
  );
}
```

**Username Enumeration (Lines 53-59):**
```typescript
const existingUsername = await UserModel.findOne({ username: username.toUpperCase() });
if (existingUsername) {
  return NextResponse.json(
    { message: 'Username già in uso' },  // "Username already in use"
    { status: 400 }
  );
}
```

**Seller Name Enumeration (Lines 62-68):**
```typescript
const existingSellerName = await UserModel.findOne({ 'seller.name': sellername });
if (existingSellerName) {
  return NextResponse.json(
    { message: 'Nome venditore già in uso' },  // "Seller name already in use"
    { status: 400 }
  );
}
```

**Attack Scenario:**
1. Attacker wants to know if `john@example.com` is registered
2. Sends registration request with that email and random username/sellername
3. Receives specific error "Indirizzo email già in uso" = email confirmed as registered
4. Can enumerate usernames and seller names the same way

**Impact:** HIGH
- Complete user enumeration via three different fields
- Attackers can build comprehensive user databases
- Seller names and usernames can be scraped
- Privacy violation

**Recommendation:**
Use generic error messages or implement rate limiting with CAPTCHA after multiple attempts.

---

### 1.3 Sign-in Endpoint - Verification Status Disclosure

**Location:** `/nextjs/src/app/api/users/signin/route.ts`

**Vulnerability:**
While the endpoint correctly uses the same message for invalid credentials, it leaks verification status through a different error message.

**Evidence:**

**Good Practice (Lines 23-37):**
```typescript
if (!user) {
  return NextResponse.json(
    { message: 'Email o password non validi' },  // Same message
    { status: 401 }
  );
}

const isPasswordValid = bcrypt.compareSync(password, user.password);

if (!isPasswordValid) {
  return NextResponse.json(
    { message: 'Email o password non validi' },  // Same message
    { status: 401 }
  );
}
```

**Verification Status Leak (Lines 39-44):**
```typescript
if (!user.verify.verified) {
  return NextResponse.json(
    { message: 'Account non verificato. Controlla la tua email.' },
    { status: 401 }
  );
}
```

**Attack Scenario:**
1. Attacker has obtained leaked credentials from another breach
2. Tests credentials on this application
3. Receives "Account non verificato" message = confirms email exists and password is correct
4. Attacker knows account exists but just needs to bypass verification

**Impact:** MEDIUM
- Confirms valid email/password combinations
- Reveals account verification status
- Aids credential stuffing attacks

**Recommendation:**
Return the same generic error for unverified accounts:
```typescript
if (!user.verify.verified) {
  return NextResponse.json(
    { message: 'Email o password non validi' },
    { status: 401 }
  );
}
```

---

## 2. TIMING SIDE-CHANNEL VULNERABILITIES

### 2.1 Password Recovery Timing Attack

**Location:** `/nextjs/src/app/api/users/password-recovery/route.ts`

**Vulnerability:**
The endpoint has significantly different execution paths for existing vs non-existing emails, creating timing side-channels.

**Analysis:**

**Non-existent email path (fast ~10-50ms):**
```typescript
const user = await UserModel.findOne({ email: email.toLowerCase() });
if (!user) {
  return NextResponse.json({ message: 'Email non trovata' }, { status: 404 });
}
// Returns immediately after DB query
```

**Existing email path (slow ~200-1000ms+):**
```typescript
const user = await UserModel.findOne({ email: email.toLowerCase() });
if (user) {
  // Generate recovery ID using keccak256 hash (computational overhead)
  const recoveryId = keccak256(toBytes(user.password));
  user.recoveryPasswordId = recoveryId;
  await user.save();  // Additional DB write
  
  // Send recovery email (network overhead, can take 500ms-2s)
  const recoveryLink = `${process.env.NEXTAUTH_URL}/password-recovery/${recoveryId}`;
  await sendPasswordRecoveryEmail(user.email, recoveryLink);
  
  return NextResponse.json({ email: true, loading: false });
}
```

**Timing Difference:**
- Non-existent email: ~10-50ms (1 DB read)
- Existing email: ~200-2000ms (1 DB read + 1 DB write + keccak256 hash + email send)
- **Difference: 150-1950ms** - easily measurable even over network

**Attack Scenario:**
```python
import requests
import time

def check_email_exists(email):
    start = time.time()
    response = requests.post('https://pagineazzurre.it/api/users/password-recovery', 
                            json={'email': email})
    elapsed = time.time() - start
    
    if elapsed > 0.2:  # 200ms threshold
        return True  # Email exists
    return False  # Email doesn't exist

# Enumerate emails even if error messages are fixed
for email in email_list:
    if check_email_exists(email):
        print(f"[+] Found: {email}")
```

**Impact:** HIGH
- Bypasses error message fixes
- Works even with consistent status codes
- Can enumerate users through automated timing analysis
- Very reliable with multiple measurements

**Recommendation:**
Implement constant-time response by always performing the same operations:
```typescript
const user = await UserModel.findOne({ email: email.toLowerCase() });

if (user) {
  const recoveryId = keccak256(toBytes(user.password));
  user.recoveryPasswordId = recoveryId;
  await user.save();
  // Send email in background/async queue
  sendPasswordRecoveryEmail(user.email, recoveryLink).catch(console.error);
} else {
  // Perform dummy operations to match timing
  keccak256(toBytes('dummy_password_string_for_timing'));
  await new Promise(resolve => setTimeout(resolve, 100)); // Simulate DB write
}

// Always return the same response
return NextResponse.json({ 
  message: 'Se l\'email è registrata, riceverai un link di recupero'
});
```

---

### 2.2 Sign-in Password Comparison Timing

**Location:** `/nextjs/src/app/api/users/signin/route.ts`

**Vulnerability:**
While bcrypt.compareSync is generally constant-time for the comparison itself, the endpoint has different execution paths.

**Evidence:**
```typescript
// Line 21-27 - Fast path (no user found)
const user = await UserModel.findOne({ email: email.toLowerCase() });
if (!user) {
  return NextResponse.json(
    { message: 'Email o password non validi' },
    { status: 401 }
  );
}

// Line 30-36 - Slower path (user found, bcrypt comparison)
const isPasswordValid = bcrypt.compareSync(password, user.password);
if (!isPasswordValid) {
  return NextResponse.json(
    { message: 'Email o password non validi' },
    { status: 401 }
  );
}
```

**Timing Difference:**
- Invalid email: ~10-30ms (1 DB query, early return)
- Valid email, wrong password: ~80-150ms (1 DB query + bcrypt.compareSync)
- **Difference: ~50-120ms** - bcrypt is intentionally slow

**Impact:** MEDIUM
- Can confirm valid emails through timing
- Less severe than password recovery due to smaller time difference
- Mitigated by rate limiting/account lockout

**Recommendation:**
```typescript
const user = await UserModel.findOne({ email: email.toLowerCase() });
const dummyHash = '$2a$08$fakehashfakehashfakehashfakehashfakehashfakehash';

if (user) {
  const isPasswordValid = bcrypt.compareSync(password, user.password);
  // Continue with real validation
} else {
  // Perform dummy bcrypt to match timing
  bcrypt.compareSync(password, dummyHash);
  return NextResponse.json(
    { message: 'Email o password non validi' },
    { status: 401 }
  );
}
```

---

## 3. RACE CONDITIONS IN VERIFICATION FLOW

### 3.1 Email Verification Race Condition - MITIGATED

**Location:** `/nextjs/src/app/api/users/verification/[id]/route.ts`

**Status:** ✅ **PROPERLY MITIGATED**

**Good Implementation:**
```typescript
// Lines 45-59 - Atomic operation prevents race conditions
const user = await UserModel.findOneAndUpdate(
  {
    'verify.trusted_link': verificationId,
    'verify.verified': false, // Only match if not already verified
  },
  {
    $set: {
      'verify.verified': true,
      loginToken,
    },
  },
  {
    new: true, // Return the updated document
  }
);
```

**Why This is Secure:**
- Uses atomic `findOneAndUpdate` operation
- Database-level guarantee that only one request succeeds
- `verify.verified: false` condition ensures verification happens exactly once
- Even if 1000 concurrent requests arrive, only ONE will set verified=true

**Additional Check (Lines 62-70):**
```typescript
if (!user) {
  // Check if user exists but is already verified
  const existingUser = await UserModel.findOne({ 'verify.trusted_link': verificationId });
  
  if (existingUser?.verify?.verified) {
    return NextResponse.json(
      { message: 'Il processo di verifica può essere eseguito solo una volta.' },
      { status: 400 }
  );
  }
}
```

**Assessment:** This is excellent defensive programming. The verification flow correctly prevents race conditions and double-verification.

---

### 3.2 Auto-Login Token Race Condition - MITIGATED

**Location:** `/nextjs/src/lib/auth/config.ts`

**Status:** ✅ **PROPERLY MITIGATED**

**Good Implementation:**
```typescript
// Lines 70-74 - Atomic one-shot token consumption
const user = await UserModel.findOneAndUpdate(
  { loginToken: credentials.token },
  { $unset: { loginToken: '' } },
  { new: false }  // Return OLD document before clearing
);
```

**Why This is Secure:**
- Atomic operation ensures token can only be used once
- Even if multiple concurrent auth requests, only first one gets the user
- Token is immediately cleared, preventing replay attacks
- `new: false` returns the document BEFORE clearing, ensuring the user who matched gets logged in

**Assessment:** Well-implemented one-shot token pattern.

---

## 4. LOGIC FLAWS AND AUTHENTICATION BYPASS

### 4.1 Password Recovery ID Predictability - CRITICAL

**Location:** `/nextjs/src/app/api/users/password-recovery/route.ts`

**Vulnerability:**
Recovery IDs are generated using keccak256 hash of the CURRENT password hash, making them potentially predictable if the password is compromised.

**Evidence:**
```typescript
// Line 32 - Recovery ID is hash of password hash
const recoveryId = keccak256(toBytes(user.password));
user.recoveryPasswordId = recoveryId;
await user.save();
```

**Critical Issue:**
The recovery ID is **deterministic** - it's always the same for the same password hash. This creates multiple security issues:

1. **Replay Attack Window:** If an attacker intercepts a valid recovery link, they know the password hash's keccak256. Even after the password is changed once, if the user changes it back to the same password, the old recovery link becomes valid again.

2. **Password Hash Exposure:** If the database is compromised and attacker gets password hashes, they can pre-compute recovery IDs:
   ```
   recoveryId = keccak256(stolen_password_hash)
   ```

3. **No Expiration:** The code doesn't show any expiration logic. A recovery ID remains valid until used.

4. **Reuse Vulnerability:** If password recovery is requested multiple times, the same recovery ID is generated, meaning old emails with the same link remain valid.

**Attack Scenario:**
```
1. User requests password recovery
2. Attacker intercepts email (compromised email account, MITM, etc.)
3. Attacker extracts recovery link: /password-recovery/{recoveryId}
4. User completes password reset to "NewPassword123"
5. Days later, user changes password back to original password
6. The OLD recovery link becomes valid again because:
   - User's password is now the original password
   - recoveryId = keccak256(bcrypt(original_password))
   - This matches the old recovery link!
```

**Impact:** CRITICAL
- Recovery links can be replayed if password is reused
- No expiration mechanism
- Deterministic generation is cryptographically weak
- Database breach exposes ability to generate valid recovery links

**Recommendation:**
```typescript
// Use cryptographically random tokens with expiration
const recoveryId = uuidv4(); // Random UUID
const recoveryExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

user.recoveryPasswordId = recoveryId;
user.recoveryPasswordExpiry = recoveryExpiry;
await user.save();

// In password replacement endpoint, check expiration:
if (user.recoveryPasswordExpiry < new Date()) {
  return NextResponse.json(
    { message: 'Link di recupero scaduto' },
    { status: 400 }
  );
}
```

---

### 4.2 Verification Link Reuse - MEDIUM RISK

**Location:** `/nextjs/src/app/api/users/verification/[id]/route.ts`

**Vulnerability:**
Verification links are UUID-based and properly protected against reuse, but the UUID is stored permanently in the database.

**Evidence:**
```typescript
// Lines 16-28 - Accept verification ID from URL or body
const { id } = await params;
let uuid: string | undefined;
try {
  const body = await request.json();
  uuid = body.uuid;
} catch {
  // Body is empty or invalid JSON - use id from params
}

const verificationId = uuid || id;
```

**Issue:**
The `trusted_link` UUID remains in the database forever after verification. While the atomic update prevents reuse, the link is never cleared.

**Database Schema (User.ts):**
```typescript
verify: {
  verified: { type: Boolean, default: false },
  trusted_link: { type: String, required: false },
}
```

After verification:
- `verified: true`
- `trusted_link: still contains the original UUID`

**Risk:**
- If database is compromised, attacker sees all verification UUIDs
- Could be used for user tracking/profiling
- Violates data minimization principle
- No reason to keep UUIDs after verification

**Impact:** MEDIUM
- Information disclosure in database breach
- Not exploitable for account takeover (atomic update protects)
- Privacy concern

**Recommendation:**
```typescript
const user = await UserModel.findOneAndUpdate(
  {
    'verify.trusted_link': verificationId,
    'verify.verified': false,
  },
  {
    $set: {
      'verify.verified': true,
      'verify.trusted_link': '',  // Clear the link after use
      loginToken,
    },
  },
  { new: true }
);
```

---

### 4.3 No Password Reset Rate Limiting

**Location:** `/nextjs/src/app/api/users/password-recovery/route.ts`

**Vulnerability:**
No rate limiting on password recovery requests allows spam and enumeration attacks.

**Evidence:**
The endpoint has no rate limiting, CAPTCHA, or cooldown period:
```typescript
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;
    // ... no rate limiting checks ...
    await sendPasswordRecoveryEmail(user.email, recoveryLink);
  }
}
```

**Attack Scenarios:**

1. **Email Bombing:**
   - Attacker repeatedly requests password recovery for victim's email
   - Victim receives hundreds of password reset emails
   - Denial of service / harassment

2. **Enumeration at Scale:**
   - Attacker can test millions of emails rapidly
   - Build database of all registered users
   - No CAPTCHA or rate limiting

3. **Resource Exhaustion:**
   - Email sending costs money (Mailtrap API)
   - Database writes cost resources
   - Can be used as DoS vector

**Impact:** HIGH
- Email bombing/harassment
- Rapid enumeration attacks
- Cost inflation (email sending costs)
- No user friction = easy automation

**Recommendation:**
```typescript
// Implement rate limiting (5 requests per hour per email)
// Use Redis or similar for tracking
const rateLimitKey = `password-recovery:${email}`;
const attempts = await redis.incr(rateLimitKey);
if (attempts === 1) {
  await redis.expire(rateLimitKey, 3600); // 1 hour
}
if (attempts > 5) {
  return NextResponse.json(
    { message: 'Troppi tentativi. Riprova tra un\'ora.' },
    { status: 429 }
  );
}

// Add CAPTCHA after 2 attempts
```

---

### 4.4 No Account Lockout on Failed Sign-in

**Location:** `/nextjs/src/app/api/users/signin/route.ts`

**Vulnerability:**
No account lockout or rate limiting on failed login attempts enables brute force attacks.

**Evidence:**
```typescript
export async function POST(request: NextRequest) {
  // No tracking of failed attempts
  const isPasswordValid = bcrypt.compareSync(password, user.password);
  if (!isPasswordValid) {
    return NextResponse.json(
      { message: 'Email o password non validi' },
      { status: 401 }
    );
  }
  // No lockout mechanism
}
```

**Attack Scenario:**
- Attacker can make unlimited password guessing attempts
- Even with bcrypt's slowness (~80-150ms), can try 600-700 passwords per minute
- No lockout after failed attempts
- Can brute force weak passwords

**Impact:** HIGH
- Brute force attacks possible
- Credential stuffing at scale
- No protection for users with weak passwords

**Recommendation:**
```typescript
// Track failed attempts per email (Redis recommended)
const failedKey = `failed-login:${email}`;
const failedAttempts = await redis.get(failedKey) || 0;

if (failedAttempts >= 5) {
  return NextResponse.json(
    { message: 'Account temporaneamente bloccato. Riprova tra 15 minuti.' },
    { status: 429 }
  );
}

// After failed login:
await redis.incr(failedKey);
await redis.expire(failedKey, 900); // 15 minutes

// Reset on successful login:
await redis.del(failedKey);
```

---

## 5. INFORMATION DISCLOSURE

### 5.1 Detailed Error Messages in Registration

**Location:** `/nextjs/src/app/api/users/register/route.ts`

**Vulnerability:**
Error messages provide too much detail about why registration failed.

**Evidence:**
```typescript
// Line 17-21 - Generic validation (acceptable)
if (!username || !email || !password || !sellername) {
  return NextResponse.json(
    { message: 'Campi obbligatori mancanti' },
    { status: 400 }
  );
}

// Lines 26-30 - Too specific
if (!emailRegex.test(email)) {
  return NextResponse.json(
    { message: 'Email non valida' },
    { status: 400 }
  );
}

// Lines 34-38 - Leaks password policy
if (password.length < 6) {
  return NextResponse.json(
    { message: 'La password deve avere almeno 6 caratteri' },
    { status: 400 }
  );
}
```

**Issues:**
1. **Weak Password Policy Exposed:** Attackers learn minimum is only 6 characters
2. **No Complexity Requirements:** Only length check, no uppercase/numbers/symbols required
3. **Password Policy Too Weak:** 6 characters is insufficient (NIST recommends 8+ minimum)

**Impact:** MEDIUM
- Weak passwords accepted
- Attackers know exact policy for credential guessing
- Users not encouraged to create strong passwords

**Recommendation:**
```typescript
// Implement stronger password policy
const passwordPolicy = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
};

if (!validatePassword(password, passwordPolicy)) {
  return NextResponse.json(
    { 
      message: 'Password non sufficientemente sicura',
      requirements: {
        length: 'Minimo 8 caratteri',
        uppercase: 'Almeno una maiuscola',
        number: 'Almeno un numero',
      }
    },
    { status: 400 }
  );
}
```

---

### 5.2 Sensitive Data in Registration Response

**Location:** `/nextjs/src/app/api/users/register/route.ts`

**Vulnerability:**
Registration endpoint returns unnecessary sensitive data.

**Evidence:**
```typescript
// Lines 123-135
return NextResponse.json({
  _id: createdUser._id.toString(),
  account: createdUser.account,           // Blockchain wallet address
  username: createdUser.username,
  email: createdUser.email,
  phone: createdUser.phone,
  cf: createdUser.cf,                     // Codice Fiscale (Italian SSN equivalent!)
  isSeller: createdUser.isSeller,
  hasAd: createdUser.hasAd,
  referer: createdUser.referer,
  newsletter: isNewsletterSubscribed,
  verified: createdUser.verify.verified,
});
```

**Critical Issues:**

1. **Codice Fiscale (cf) Exposure:**
   - Italian tax ID number (equivalent to SSN)
   - Highly sensitive personal identifier
   - Should NEVER be returned in API responses
   - Contains date of birth and birthplace information

2. **Phone Number Exposure:**
   - PII that shouldn't be returned unless necessary
   - Can be used for spam/harassment

3. **Wallet Address Exposure:**
   - While blockchain addresses are public, exposing immediately after registration
   - Could enable tracking/profiling

**Impact:** CRITICAL
- Leaks Italian SSN equivalent (Codice Fiscale)
- Violates GDPR data minimization
- Privacy violation
- Unnecessary exposure of PII

**Recommendation:**
```typescript
return NextResponse.json({
  _id: createdUser._id.toString(),
  username: createdUser.username,
  email: createdUser.email,
  verified: createdUser.verify.verified,
  // Remove: cf, phone, account (unless specifically needed by client)
  // These should only be returned in authenticated profile endpoints
});
```

---

## 6. OAUTH/SSO FLOW ISSUES

### 6.1 No OAuth/External Providers Configured

**Location:** `/nextjs/src/lib/auth/config.ts`

**Status:** Not applicable

**Evidence:**
```typescript
export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({ id: 'credentials', ... }),
    CredentialsProvider({ id: 'verification-autologin', ... }),
  ],
  // No OAuth providers (Google, Facebook, etc.)
}
```

**Finding:**
The application only uses credentials-based authentication. No OAuth/SSO providers are configured.

**Impact:** INFORMATIONAL
- No OAuth-specific vulnerabilities to assess
- Application relies entirely on password authentication
- Consider adding OAuth providers for better security (Google, GitHub, etc.)

---

### 6.2 No Open Redirect Vulnerabilities Found

**Analysis:**
Reviewed authentication flows for redirect vulnerabilities:

1. **Sign-in Page Configuration:**
```typescript
pages: {
  signIn: '/signin',
  error: '/signin',
}
```
- Fixed redirect paths
- No user-controlled redirect parameters found

2. **Verification Flow:**
```typescript
// Verification link format (email.ts)
const verificationLink = `${process.env.NEXTAUTH_URL}/verification/${trustedLink}`;
```
- Fixed base URL from environment
- UUID appended to fixed path
- No user-controlled redirect

3. **Password Recovery:**
```typescript
const recoveryLink = `${process.env.NEXTAUTH_URL}/password-recovery/${recoveryId}`;
```
- Fixed base URL
- No redirect parameter

**Finding:** ✅ No open redirect vulnerabilities detected in authentication flows.

---

## 7. SESSION AND TOKEN SECURITY

### 7.1 Insecure Session Configuration - HIGH RISK

**Location:** `/nextjs/src/lib/auth/config.ts`

**Vulnerability:**
Session configuration has security weaknesses.

**Evidence:**
```typescript
session: {
  strategy: 'jwt',
  maxAge: 30 * 24 * 60 * 60, // 30 days
},
secret: process.env.NEXTAUTH_SECRET,
```

**Issues:**

1. **Excessive Session Duration:**
   - 30 days is very long
   - If JWT is stolen, attacker has 30 days of access
   - No session refresh or re-authentication required
   - OWASP recommends maximum 24 hours for sensitive applications

2. **No Session Rotation:**
   - JWTs are not rotated/refreshed
   - Same token for full 30 days
   - If token leaks at day 1, valid for 29 more days

3. **Environment Secret Dependency:**
   - If `NEXTAUTH_SECRET` is not set or weak, sessions are compromised
   - No validation that secret exists or has sufficient entropy

**Attack Scenario:**
```
1. User logs in, receives JWT valid for 30 days
2. JWT stored in browser (cookie or localStorage)
3. XSS vulnerability on site (different vector) steals JWT
4. Attacker has 30 days to use the stolen JWT
5. No way for user to invalidate JWT (stateless)
```

**Impact:** HIGH
- Long-lived tokens increase attack window
- No revocation mechanism (stateless JWTs)
- If credentials change, old JWTs remain valid

**Recommendation:**
```typescript
session: {
  strategy: 'jwt',
  maxAge: 24 * 60 * 60, // 24 hours maximum
  updateAge: 60 * 60,   // Refresh every hour
},
secret: process.env.NEXTAUTH_SECRET,
// Add secret validation in startup
if (!process.env.NEXTAUTH_SECRET || process.env.NEXTAUTH_SECRET.length < 32) {
  throw new Error('NEXTAUTH_SECRET must be set and at least 32 characters');
}
```

**Better Alternative - Hybrid Approach:**
```typescript
// Use database sessions for better security
session: {
  strategy: 'database',  // Allows revocation
  maxAge: 7 * 24 * 60 * 60, // 7 days
}
// This allows:
// - Session revocation on password change
// - Logout from all devices
// - Better audit logging
```

---

### 7.2 JWT Payload Information Disclosure

**Location:** `/nextjs/src/lib/auth/config.ts`

**Vulnerability:**
JWT tokens contain potentially sensitive information.

**Evidence:**
```typescript
async jwt({ token, user, trigger }) {
  if (user) {
    token.id = user.id;
    token.isAdmin = user.isAdmin;          // Privilege escalation target
    token.isSeller = user.isSeller;
    token.hasAd = user.hasAd;
    token.account = user.account;          // Wallet address
    token.sellerName = user.sellerName;
  }
  return token;
}
```

**Issues:**

1. **Admin Status in JWT:**
   - `isAdmin` flag is stored client-side
   - JWTs are typically stored in cookies/localStorage
   - If JWT signing is compromised, attacker can forge admin tokens
   - Should verify admin status server-side on every request

2. **Wallet Address in JWT:**
   - Blockchain wallet address exposed in token
   - While addresses are "public", this enables tracking
   - Unnecessary to include in every request

3. **JWT Update Mechanism:**
```typescript
// Lines 113-131 - Update trigger refreshes from DB
if (trigger === 'update' && token.id) {
  const fresh = await UserModel.findById(token.id).lean();
  if (fresh) {
    token.isAdmin = fresh.isAdmin ?? token.isAdmin;
    // Updates token from database
  }
}
```

**Positive:** The update mechanism is good - allows refreshing token data without re-login.

**Issue:** Client controls when updates happen. If user is demoted from admin, they can delay update.

**Impact:** MEDIUM
- Admin privilege stored client-side
- Potential for token forgery if secret leaks
- Delayed privilege revocation

**Recommendation:**
```typescript
// 1. Always verify admin status server-side
async function requireAdmin(req) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error('Not authenticated');
  
  // Re-verify from database, don't trust JWT
  const user = await UserModel.findById(session.user.id);
  if (!user?.isAdmin) throw new Error('Not authorized');
  
  return user;
}

// 2. Remove sensitive data from JWT
async jwt({ token, user }) {
  if (user) {
    token.id = user.id;
    // Remove isAdmin from JWT - verify server-side instead
    // Remove wallet address - query when needed
  }
  return token;
}
```

---

## 8. ADDITIONAL SECURITY CONCERNS

### 8.1 Weak Password Hashing Configuration

**Location:** Multiple files using bcrypt

**Vulnerability:**
Bcrypt salt rounds set to 8, which is below current recommendations.

**Evidence:**
```typescript
// signin/route.ts, register/route.ts, password-replacement/route.ts
const hashedPassword = bcrypt.hashSync(password, 8);
```

**Issue:**
- Salt rounds = 8 means 2^8 = 256 iterations
- Modern recommendations: 12-14 rounds
- 8 rounds was acceptable in 2000s, now considered weak
- Makes password cracking faster on modern hardware

**Comparison:**
- 8 rounds: ~5ms per hash (200 hashes/second)
- 12 rounds: ~80ms per hash (12 hashes/second)
- Attacker can test passwords 16x faster with rounds=8

**Impact:** MEDIUM
- Weakens defense against offline attacks
- If database is breached, password cracking is easier
- Not immediately exploitable, but reduces security margin

**Recommendation:**
```typescript
// Increase to 12 rounds minimum
const hashedPassword = bcrypt.hashSync(password, 12);

// Or use bcrypt.hash (async) for better performance
const hashedPassword = await bcrypt.hash(password, 12);
```

**Cost:**
- Registration/password change: slight delay (70ms extra)
- Worth the security improvement
- Consider async version to not block event loop

---

### 8.2 No Email Verification Expiry

**Location:** `/nextjs/src/app/api/users/verification/[id]/route.ts`

**Vulnerability:**
Verification links never expire.

**Evidence:**
```typescript
// Verification checks UUID and verified status, but not expiry
const user = await UserModel.findOneAndUpdate(
  {
    'verify.trusted_link': verificationId,
    'verify.verified': false,
  },
  {
    $set: {
      'verify.verified': true,
      loginToken,
    },
  },
  { new: true }
);
```

**User Model Schema:**
```typescript
verify: {
  verified: { type: Boolean, default: false },
  trusted_link: { type: String, required: false },
  // No expiry field!
}
```

**Issue:**
- Verification links valid forever
- User registers in 2025, verification email sits in inbox
- Attacker compromises email account in 2026
- Old verification link still works

**Impact:** MEDIUM
- Indefinite validity increases attack window
- Email accounts are often compromised long after emails received
- Best practice: 24-48 hour expiry

**Recommendation:**
```typescript
// Add expiry to schema
verify: {
  verified: { type: Boolean, default: false },
  trusted_link: { type: String, required: false },
  link_expiry: { type: Date, required: false },
}

// Set expiry on registration
verify: { 
  trusted_link: trustedLink, 
  verified: false,
  link_expiry: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
}

// Check expiry on verification
const user = await UserModel.findOne({ 'verify.trusted_link': verificationId });
if (user && user.verify.link_expiry < new Date()) {
  return NextResponse.json(
    { message: 'Link di verifica scaduto. Richiedine uno nuovo.' },
    { status: 400 }
  );
}
```

---

### 8.3 Password Storage in User Model (toJSON)

**Location:** `/nextjs/src/lib/db/models/User.ts`

**Finding:** ✅ **PROPERLY IMPLEMENTED**

**Evidence:**
```typescript
// Lines 110-117 - Excellent security practice
userSchema.methods.toJSON = function () {
  const user = this.toObject();
  delete user.accountKey;         // Private key
  delete user.password;           // Password hash
  delete user.recoveryPasswordId; // Recovery token
  delete user.loginToken;         // One-shot token
  return user;
};
```

**Assessment:**
This is excellent security practice. Prevents accidental password exposure in API responses.

**Test:**
Even if developer does `res.json(user)`, sensitive fields are automatically stripped.

---

## 9. SUMMARY OF VULNERABILITIES

### Critical (Fix Immediately)

1. **Password Recovery User Enumeration (404 vs 200)**
   - File: `password-recovery/route.ts`
   - Impact: Attackers can enumerate all registered emails
   - Fix: Return same message regardless of email existence

2. **Password Recovery Timing Attack**
   - File: `password-recovery/route.ts`
   - Impact: 150-1950ms timing difference reveals user existence
   - Fix: Implement constant-time responses

3. **Deterministic Recovery ID Generation**
   - File: `password-recovery/route.ts`
   - Impact: Recovery links can be replayed or pre-computed
   - Fix: Use random UUIDs with expiration

4. **Codice Fiscale Exposure in Registration Response**
   - File: `register/route.ts`
   - Impact: Italian SSN equivalent leaked to client
   - Fix: Remove from API response

### High Priority

5. **Registration Endpoint User Enumeration (Email/Username/Seller)**
   - File: `register/route.ts`
   - Impact: Three different enumeration vectors
   - Fix: Generic error messages or CAPTCHA

6. **No Rate Limiting on Password Recovery**
   - File: `password-recovery/route.ts`
   - Impact: Email bombing, rapid enumeration
   - Fix: Implement rate limiting and CAPTCHA

7. **No Account Lockout on Failed Logins**
   - File: `signin/route.ts`
   - Impact: Unlimited brute force attempts
   - Fix: Implement account lockout after 5 failed attempts

8. **30-Day Session Duration**
   - File: `auth/config.ts`
   - Impact: Stolen JWTs valid for extended period
   - Fix: Reduce to 24 hours, implement rotation

### Medium Priority

9. **Verification Status Disclosure in Sign-in**
   - File: `signin/route.ts`
   - Impact: Confirms valid credentials
   - Fix: Same error message for unverified accounts

10. **Sign-in Timing Attack (bcrypt)**
    - File: `signin/route.ts`
    - Impact: ~50-120ms difference reveals valid emails
    - Fix: Dummy bcrypt call for invalid emails

11. **No Verification Link Expiry**
    - File: `verification/[id]/route.ts`
    - Impact: Links valid forever
    - Fix: Add 24-hour expiration

12. **Weak Bcrypt Salt Rounds (8 vs 12)**
    - Files: Multiple
    - Impact: Faster password cracking if DB breached
    - Fix: Increase to 12 rounds

13. **Weak Password Policy (6 chars minimum)**
    - File: `register/route.ts`
    - Impact: Weak passwords accepted
    - Fix: Require 8+ chars with complexity

14. **Admin Status in JWT**
    - File: `auth/config.ts`
    - Impact: Client-side privilege storage
    - Fix: Verify admin status server-side

### Low Priority / Informational

15. **Verification Link Not Cleared After Use**
    - File: `verification/[id]/route.ts`
    - Impact: Unnecessary data retention
    - Fix: Clear trusted_link after verification

16. **No OAuth Providers**
    - File: `auth/config.ts`
    - Impact: Reliance on passwords only
    - Recommendation: Add Google/GitHub OAuth

---

## 10. TESTING RECOMMENDATIONS

### Automated Testing

1. **User Enumeration Tests:**
```bash
# Test password recovery enumeration
curl -X POST https://pagineazzurre.it/api/users/password-recovery \
  -H "Content-Type: application/json" \
  -d '{"email":"exists@example.com"}'
# Expected: 200 { email: true }

curl -X POST https://pagineazzurre.it/api/users/password-recovery \
  -H "Content-Type: application/json" \
  -d '{"email":"doesnotexist@example.com"}'
# Expected: 404 { message: 'Email non trovata' }
# ^^^ VULNERABILITY: Different responses
```

2. **Timing Attack Test:**
```python
import requests
import time
import statistics

def measure_timing(email, iterations=10):
    times = []
    for _ in range(iterations):
        start = time.time()
        requests.post('https://pagineazzurre.it/api/users/password-recovery',
                     json={'email': email})
        elapsed = time.time() - start
        times.append(elapsed)
    return statistics.mean(times), statistics.stdev(times)

# Test with known valid email
valid_mean, valid_std = measure_timing('valid@example.com')
print(f"Valid email: {valid_mean:.3f}s ± {valid_std:.3f}s")

# Test with invalid email  
invalid_mean, invalid_std = measure_timing('invalid@example.com')
print(f"Invalid email: {invalid_mean:.3f}s ± {invalid_std:.3f}s")

if abs(valid_mean - invalid_mean) > 0.1:  # 100ms difference
    print("⚠️  TIMING ATTACK POSSIBLE")
```

3. **Rate Limiting Test:**
```bash
# Test no rate limiting on password recovery
for i in {1..100}; do
  curl -X POST https://pagineazzurre.it/api/users/password-recovery \
    -H "Content-Type: application/json" \
    -d '{"email":"victim@example.com"}' &
done
wait
# If all 100 succeed, rate limiting is missing
```

### Manual Testing

1. **Verify Recovery ID Predictability:**
   - Request password recovery for an account you control
   - Note the recovery ID from email
   - Request password recovery again
   - Check if recovery ID is the same (it should be - proving determinism)

2. **Test Verification Race Condition (should fail due to atomic update):**
   - Get verification link
   - Send 10 concurrent requests to verification endpoint
   - Verify only 1 succeeds (good) or multiple succeed (bad)
   - Check database: user.verify.verified should be true only once

3. **JWT Manipulation:**
   - Login and capture JWT
   - Decode JWT (jwt.io)
   - Check what data is in payload (should not include password, keys)
   - Verify isAdmin flag can't be manipulated

---

## 11. COMPLIANCE CONCERNS

### GDPR Violations

1. **Codice Fiscale Exposure:**
   - Article 5(1)(c): Data minimization
   - Sending CF (SSN equivalent) to client violates minimization
   - Must remove from API responses

2. **Excessive Data Retention:**
   - Verification links stored forever
   - Recovery IDs not cleared
   - Violates storage limitation principle

3. **User Enumeration:**
   - Article 25: Privacy by design
   - Allowing user enumeration violates privacy
   - Must fix different error messages

### Italian Privacy Law (Codice Privacy)

**Critical:** Codice Fiscale is specifically protected under Italian law:
- D.Lgs. 196/2003 (Privacy Code)
- Article 24: Misura minime di sicurezza
- Exposing CF in API responses likely violates security minimums

**Recommendation:** Immediate removal of `cf` from all API responses.

---

## 12. REMEDIATION PRIORITIES

### Week 1 (Critical Fixes)

1. Fix password recovery enumeration (error messages)
2. Fix password recovery timing attack (constant-time response)
3. Replace deterministic recovery ID with UUID + expiration
4. Remove Codice Fiscale from registration response

### Week 2 (High Priority)

5. Implement rate limiting on password recovery
6. Implement account lockout on failed logins
7. Add CAPTCHA to password recovery after 2 attempts
8. Reduce session duration from 30 days to 24 hours

### Week 3 (Medium Priority)

9. Fix registration enumeration (generic errors)
10. Increase bcrypt rounds from 8 to 12
11. Add verification link expiration (24 hours)
12. Strengthen password policy (8+ chars, complexity)

### Week 4 (Hardening)

13. Implement dummy bcrypt call for timing consistency
14. Add server-side admin verification
15. Clear verification links after use
16. Add comprehensive rate limiting

---

## 13. CONCLUSION

The authentication system has **multiple critical vulnerabilities** that require immediate attention:

**Most Critical Issues:**
1. User enumeration via password recovery (trivial to exploit)
2. Timing attacks enabling automated enumeration
3. Predictable/replayable recovery tokens
4. Exposure of sensitive PII (Codice Fiscale)

**Positive Findings:**
- Verification flow correctly uses atomic operations (no race conditions)
- Auto-login tokens properly implemented as one-shot
- Password hashing uses bcrypt (though salt rounds could be higher)
- User.toJSON() correctly strips sensitive fields

**Overall Risk Assessment:** HIGH

The application is vulnerable to systematic user enumeration through multiple vectors. Combined with lack of rate limiting and weak password policies, this creates significant security and privacy risks. GDPR compliance is also at risk due to Codice Fiscale exposure.

**Recommended Action:** Implement Critical and High Priority fixes within 2 weeks.
