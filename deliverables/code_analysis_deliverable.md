# Data Security Audit Report
## Pagine Azzurre E-Commerce Platform

**Assessment Date:** 2026-04-14  
**Database:** MongoDB (Mongoose ODM)  
**Framework:** Express.js / Node.js  
**Assessment Scope:** Sensitive data flows, encryption, database security, GDPR compliance

---

## Executive Summary

This audit identifies **CRITICAL** security vulnerabilities in the handling of blockchain private keys, along with moderate concerns regarding PII protection, multi-tenant isolation, and GDPR compliance. While password hashing is properly implemented, the **plaintext storage of blockchain private keys represents an unacceptable security risk** that could result in complete financial compromise of all user accounts.

**Critical Findings:**
- ❌ Blockchain private keys stored in plaintext (CRITICAL)
- ✅ Passwords properly hashed with bcrypt (salt rounds: 8)
- ⚠️ Italian tax codes (CF) and PII inadequately protected
- ⚠️ Weak multi-tenant isolation (missing seller ownership verification)
- ⚠️ Limited GDPR compliance mechanisms
- ✅ Database connection strings use environment variables
- ⚠️ Sensitive data exposed in console logs

---

## 1. SENSITIVE DATA INVENTORY

### 1.1 Blockchain Private Keys (CRITICAL)

**Data Type:** Blockchain Private Keys (accountKey)  
**Sensitivity Level:** CRITICAL

**Storage Locations:**
- File: `/Users/chocos/Desktop/pagine_azzurre/backend/models/userModel.js`
- Line: 6
- Field: `accountKey` (String, required, unique)
- Encryption: **NO - STORED IN PLAINTEXT** ❌

**Input Points:**
- Endpoint: `POST /api/users/register` (Line 109-199 in userRouter.js)
- Generation: Auto-generated during registration using Web3:
  ```javascript
  const userPassword = bcrypt.hashSync(req.body.password, 8)
  const userAccount = await web3.eth.accounts.create((userPassword + process.env.ENTROPY))
  // userAccount.privateKey stored directly in database
  ```
- Validation: None (auto-generated)
- Sanitization: None

**Output Points:**
- API Responses: **FILTERED** via toJSON() method (Line 46-52 in userModel.js)
  ```javascript
  userSchema.methods.toJSON = function() {
    const user = this.toObject();
    delete user.accountKey;  // Excluded from API responses
    delete user.password;
    delete user.recoveryPasswordId;
    return user;
  };
  ```
- Payment Processing: **EXPOSED** - Private key retrieved and used directly (paymentRouter.js:22)
  ```javascript
  const buyerPvKey = buyer[0].accountKey
  const provider = new HDWalletProvider([buyerPvKey], InfuraUrl)
  ```
- Logs: Not directly logged, but visible in database dumps

**Security Controls:**
- At-rest protection: **NONE** ❌
- In-transit protection: HTTPS (application-level, not enforced in code)
- Access controls: Database-level only (no field-level encryption)
- Output filtering: ✅ Implemented via toJSON()

**Compliance Gaps:**
- **PCI-DSS equivalent for crypto:** Private keys must be encrypted at rest
- **No key rotation mechanism:** Once compromised, keys cannot be rotated
- **Single point of failure:** Database breach = complete financial compromise
- **No HSM/KMS integration:** Keys not stored in hardware security module

**Attack Vectors:**
1. Database breach → All private keys exposed in plaintext
2. Database backup exposure → Historical keys compromised
3. Insider threat → DBAs have access to all funds
4. Log file exposure → Keys may appear in error logs

---

### 1.2 Passwords

**Data Type:** User Passwords  
**Sensitivity Level:** CRITICAL

**Storage Locations:**
- File: `/Users/chocos/Desktop/pagine_azzurre/backend/models/userModel.js`
- Line: 19
- Field: `password` (String, required)
- Encryption: **YES - bcrypt with 8 salt rounds** ✅

**Input Points:**
- Endpoint: `POST /api/users/register` (userRouter.js:109)
- Endpoint: `POST /api/users/signin` (userRouter.js:74)
- Endpoint: `PUT /api/users/profile` (userRouter.js:222) - password update
- Endpoint: `POST /api/users/password-replacement` (userRouter.js:433) - password recovery
- Validation: ✅ Implemented (validators.js:33-37)
  ```javascript
  body('password')
    .isLength({ min: 8 })
    .withMessage('La password deve essere di almeno 8 caratteri')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('La password deve contenere almeno una lettera maiuscola, una minuscola e un numero')
  ```
- Sanitization: None (hashed immediately)

**Hashing Implementation:**
- Algorithm: bcrypt
- Salt rounds: 8 (Line 115: `bcrypt.hashSync(req.body.password, 8)`)
- Comparison: `bcrypt.compareSync()` used for login (Line 79)

**Output Points:**
- API Responses: **FILTERED** via toJSON() ✅
- Logs: Not logged
- Emails: Never sent in plaintext ✅

**Security Controls:**
- At-rest protection: ✅ bcrypt hashing
- In-transit protection: HTTPS (assumed)
- Access controls: Database-level
- Password recovery: Temporary hash-based token system (Line 415)
  ```javascript
  data[0].recoveryPasswordId = Web3.utils.keccak256(data[0].password)
  ```

**Compliance Gaps:**
- ⚠️ **Salt rounds:** 8 rounds is below modern recommendations (should be 10-12)
- ✅ Password complexity enforced
- ⚠️ No password history (users can reuse old passwords)
- ⚠️ No MFA/2FA implementation

---

### 1.3 Italian Tax Codes (Codice Fiscale & Partita IVA)

**Data Type:** Italian Tax Identifiers (CF and Partita IVA)  
**Sensitivity Level:** HIGH (PII - Protected under GDPR)

**Storage Locations:**
- File: `/Users/chocos/Desktop/pagine_azzurre/backend/models/userModel.js`
- Line: 13-14
- Fields: 
  - `cf` (Codice Fiscale) - String, optional, unique, uppercase
  - `partitaIva` (VAT Number) - String, optional, unique
- Encryption: **NO** ❌

**Input Points:**
- Endpoint: `POST /api/users/register` (userRouter.js:125)
- Endpoint: `PUT /api/users/profile` (userRouter.js:235)
- Validation: ✅ CF validated (validators.js:45-51)
  ```javascript
  body('cf')
    .optional()
    .trim()
    .isLength({ min: 16, max: 16 })
    .withMessage('Il Codice Fiscale deve essere di 16 caratteri')
    .matches(/^[A-Z]{6}[0-9]{2}[A-Z][0-9]{2}[A-Z][0-9]{3}[A-Z]$/i)
    .withMessage('Inserisci un Codice Fiscale valido')
  ```
- Validation: ✅ Partita IVA validated (validators.js:125-129)
  ```javascript
  body('partitaIva')
    .optional()
    .trim()
    .matches(/^[0-9]{11}$/)
    .withMessage('La Partita IVA deve essere di 11 cifre')
  ```

**Output Points:**
- API Responses: **NOT FILTERED** ⚠️
  - Exposed in signin response (Line 89)
  - Exposed in profile response (Line 259)
  - CF is returned to authenticated users for their own profile
- Logs: Not directly logged
- Emails: Not included in emails ✅

**Security Controls:**
- At-rest protection: None (plaintext in database)
- In-transit protection: HTTPS (assumed)
- Access controls: Only exposed to authenticated user's own profile
- GDPR compliance: ⚠️ No explicit consent mechanism for CF/Partita IVA collection

**Compliance Gaps:**
- **GDPR Article 9:** Tax identifiers are sensitive personal data
- **No encryption at rest:** Should be encrypted or tokenized
- **No data minimization analysis:** Is CF required for all users?
- **No purpose limitation:** No clear documentation why CF is collected

---

### 1.4 Email Addresses

**Data Type:** Email Addresses  
**Sensitivity Level:** MEDIUM (PII)

**Storage Locations:**
- File: `/Users/chocos/Desktop/pagine_azzurre/backend/models/userModel.js`
- Line: 15
- Field: `email` (String, required, unique, trimmed)
- Also stored in: `/Users/chocos/Desktop/pagine_azzurre/backend/models/newsletterModel.js` (Line 6)
- Encryption: **NO** ❌

**Input Points:**
- Endpoint: `POST /api/users/register` (userRouter.js:126)
- Endpoint: `POST /api/users/newsletter` (userRouter.js:467)
- Validation: ✅ Email format validated (validators.js:27-31)
- Sanitization: ✅ Trimmed and normalized

**Output Points:**
- API Responses: Exposed in user profiles
- Email notifications: Used as recipient address
- Order notifications: **EXPOSED to other users** ⚠️
  - Buyer's email sent to seller (mailMsg.js:183-185)
  - Seller's email sent to buyer (mailMsg.js:212-214)
- Logs: Not directly logged

**Security Controls:**
- At-rest protection: None
- In-transit protection: HTTPS
- Access controls: Visible to authenticated users in transactions
- Newsletter consent: ✅ Verified flag implemented

**Compliance Gaps:**
- ⚠️ **Email exposed in order notifications:** Buyers/sellers can see each other's emails
- ✅ Newsletter consent mechanism exists (verified flag)
- ⚠️ No email masking in public contexts

---

### 1.5 Phone Numbers

**Data Type:** Phone Numbers  
**Sensitivity Level:** MEDIUM (PII)

**Storage Locations:**
- File: `/Users/chocos/Desktop/pagine_azzurre/backend/models/userModel.js`
- Line: 18
- Field: `phone` (String, optional, unique)
- Also in: Order shipping addresses (orderModel.js:25)
- Encryption: **NO** ❌

**Input Points:**
- Endpoint: `POST /api/users/register` (userRouter.js:127)
- Endpoint: `PUT /api/users/profile` (userRouter.js:239)
- Endpoint: `POST /api/orders` (in shippingAddress)
- Validation: ✅ Phone format validated (validators.js:39-43)
  ```javascript
  body('phone')
    .optional()
    .trim()
    .matches(/^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/)
  ```

**Output Points:**
- API Responses: Exposed in user profiles
- Order notifications: **EXPOSED to other users** ⚠️
  - Phone numbers shared between buyer and seller (mailMsg.js:185, 213)
- Emails: Included in order confirmation emails

**Security Controls:**
- At-rest protection: None
- In-transit protection: HTTPS
- Access controls: Visible to transaction counterparties
- Newsletter consent: Not applicable

**Compliance Gaps:**
- ⚠️ **Phone exposed in order notifications:** No option to hide phone number
- ⚠️ No phone masking (e.g., showing only last 4 digits)
- ⚠️ No separate consent for phone sharing

---

### 1.6 Physical Addresses

**Data Type:** Shipping Addresses  
**Sensitivity Level:** MEDIUM (PII)

**Storage Locations:**
- File: `/Users/chocos/Desktop/pagine_azzurre/backend/models/orderModel.js`
- Lines: 19-28
- Fields: fullName, address, city, postalCode, country, phone, lat, lng
- Encryption: **NO** ❌

**Input Points:**
- Endpoint: `POST /api/orders` (orderRouter.js:59)
- Validation: ✅ Address fields validated (validators.js:186-214)
- Sanitization: Trimmed

**Output Points:**
- API Responses: Exposed in order details to authenticated users
- Not included in emails (good practice) ✅
- Geolocation data (lat/lng) stored but not validated ⚠️

**Security Controls:**
- At-rest protection: None
- In-transit protection: HTTPS
- Access controls: Only visible to order owner and seller
- Multi-tenant isolation: ⚠️ See Section 6

**Compliance Gaps:**
- ⚠️ **Geolocation data:** Lat/lng coordinates are sensitive (GDPR Article 4(1))
- ⚠️ No data retention policy for old addresses
- ✅ Addresses not shared beyond transaction parties

---

### 1.7 Names and Usernames

**Data Type:** Personal Names  
**Sensitivity Level:** LOW-MEDIUM (PII)

**Storage Locations:**
- File: `/Users/chocos/Desktop/pagine_azzurre/backend/models/userModel.js`
- Lines: 7-9 (username, name, surname, birthday, birthplace, gender)
- Encryption: **NO**

**Input Points:**
- Endpoint: `POST /api/users/register` (username only)
- Endpoint: `PUT /api/users/profile` (all fields)
- Validation: ✅ Username validated (validators.js:20-25)
  ```javascript
  body('username')
    .trim()
    .isLength({ min: 3, max: 30 })
    .matches(/^[a-zA-Z0-9_-]+$/)
  ```

**Output Points:**
- API Responses: Publicly visible (top sellers, product sellers)
- Emails: Used in welcome emails
- Reviews: Username visible in product reviews ⚠️

**Security Controls:**
- At-rest protection: None
- In-transit protection: HTTPS
- Access controls: Public visibility for sellers

**Compliance Gaps:**
- ⚠️ **Birthday/birthplace/gender:** Collected but not always necessary
- ⚠️ No clear purpose for collecting birthday and birthplace
- ✅ Username adequately protected

---

## 2. ENCRYPTION ANALYSIS

### 2.1 Password Hashing

**Algorithm:** bcrypt  
**Configuration:**
- Salt rounds: 8
- Implementation: `bcryptjs` package
- Location: userRouter.js:115, 250, 303, 437

**Assessment:**
- ✅ Industry-standard algorithm
- ⚠️ **Salt rounds below modern recommendations:** Current: 8, Recommended: 10-12
- ✅ Proper use of `compareSync` for verification
- ✅ Passwords never stored in plaintext
- ✅ No custom crypto implementations (good)

**Recommendations:**
- Increase salt rounds to 10-12 for new passwords
- Implement password rehashing on login (migrate old hashes)

---

### 2.2 Data-at-Rest Encryption

**Database-Level Encryption:** ❌ NOT IMPLEMENTED

**Field-Level Encryption:** ❌ NOT IMPLEMENTED

**Analysis:**
- MongoDB connection string uses environment variables ✅
- No MongoDB encrypted storage engine configured
- No application-level field encryption for:
  - ❌ Private keys (CRITICAL)
  - ❌ Tax codes (CF/Partita IVA)
  - ❌ Email addresses
  - ❌ Phone numbers
  - ❌ Physical addresses

**Attack Surface:**
- Database backups stored in plaintext
- Database administrator access = full data access
- Memory dumps may expose sensitive data
- Log files may contain query results

**Recommendations:**
- **CRITICAL:** Implement encryption for `accountKey` field immediately
- Enable MongoDB Encrypted Storage Engine or use client-side field-level encryption
- Encrypt CF/Partita IVA fields using deterministic encryption (for querying)
- Consider envelope encryption with AWS KMS or similar

---

### 2.3 Data-in-Transit Encryption

**HTTPS Enforcement:** ⚠️ NOT ENFORCED IN CODE

**Analysis:**
- CORS configured for specific origins (server.js:17-40) ✅
- Allowed origins include HTTPS URLs ✅
- **No HTTP → HTTPS redirect in application code** ❌
- **No HSTS headers configured** ❌
- **No certificate pinning** (acceptable for web app)

**TLS Configuration:**
- Relies on reverse proxy (Railway, Vercel) for TLS termination
- No TLS configuration in application code (expected for Node.js behind proxy)

**Recommendations:**
- Add helmet.js middleware for security headers:
  ```javascript
  app.use(helmet.hsts({
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }));
  ```
- Redirect HTTP to HTTPS at application level (or ensure reverse proxy does)
- Add CSP headers to prevent XSS

---

### 2.4 Blockchain Key Management

**Implementation:** Web3.js account creation  
**Location:** userRouter.js:116-117

**Key Generation:**
```javascript
const userPassword = bcrypt.hashSync(req.body.password, 8)
const userAccount = await web3.eth.accounts.create((userPassword + process.env.ENTROPY))
// Returns: { address: '0x...', privateKey: '0x...' }
```

**Storage:**
- Private key: **PLAINTEXT in database** ❌ (Line 123)
- Public address: Plaintext in database ✅ (acceptable)

**Usage:**
- Payment processing: Private key retrieved from database (paymentRouter.js:22)
- HDWalletProvider initialized with plaintext key (paymentRouter.js:25)

**Critical Issues:**
1. **No key encryption:** Private keys stored raw in MongoDB
2. **No key derivation:** Keys not derived from user password (good for recovery, bad for security)
3. **No hardware wallet support:** All keys are hot wallets
4. **No multi-sig support:** Single point of failure
5. **ENTROPY source unclear:** Environment variable not validated

**Attack Scenarios:**
- **Database breach:** Attacker gains all private keys → steals all funds
- **SQL injection / NoSQL injection:** Could expose private keys
- **Insider threat:** Database administrators can steal funds
- **Backup compromise:** Old backups contain all historical keys

**Recommendations (CRITICAL):**
1. **Immediate:** Encrypt `accountKey` field using AES-256-GCM with key from KMS
2. **Short-term:** Implement custodial wallet architecture with HSM
3. **Long-term:** Support hardware wallets (MetaMask, Ledger) and remove private key storage
4. **Alternative:** Use multi-party computation (MPC) for key management

**Example Encryption Implementation:**
```javascript
// On storage:
const crypto = require('crypto');
const algorithm = 'aes-256-gcm';
const kmsKey = await getKeyFromKMS(); // AWS KMS, HashiCorp Vault, etc.
const iv = crypto.randomBytes(16);
const cipher = crypto.createCipheriv(algorithm, kmsKey, iv);
const encrypted = Buffer.concat([cipher.update(privateKey, 'utf8'), cipher.final()]);
const authTag = cipher.getAuthTag();
// Store: encrypted + iv + authTag

// On retrieval:
const decipher = crypto.createDecipheriv(algorithm, kmsKey, iv);
decipher.setAuthTag(authTag);
const privateKey = decipher.update(encrypted) + decipher.final('utf8');
```

---

### 2.5 Secret Management

**Environment Variables:** ✅ PROPERLY USED

**Configuration Analysis:**
- File: server.js:12 (`dotenv.config()`)
- .env.example provided with clear instructions ✅
- Sensitive values in environment variables:
  - ✅ `JWT_SECRET` (with fallback warning for development)
  - ✅ `MONGODB_URL`
  - ✅ `SENDGRID_API_KEY`
  - ✅ `WEB3_INFURA_URL`
  - ✅ `PAYPAL_CLIENT_ID`
  - ✅ `GOOGLE_API_KEY`

**JWT Secret Handling:**
- Location: utils.js:4-15
- **Good practice:** Throws error if JWT_SECRET not set in production ✅
- **Warning:** Allows fallback in development ✅
- **Issue:** JWT tokens have 30-day expiration (Line 28) ⚠️

**Secret Rotation:**
- ❌ No mechanism for rotating JWT_SECRET
- ❌ No mechanism for rotating database credentials
- ❌ No mechanism for rotating API keys

**Recommendations:**
- Implement secret rotation for JWT_SECRET (invalidate old tokens on rotation)
- Use AWS Secrets Manager or HashiCorp Vault for secret management
- Reduce JWT expiration to 7 days or implement refresh tokens
- Document secret rotation procedures

---

## 3. DATABASE SECURITY CONTROLS

### 3.1 Connection String Security

**Implementation:** ✅ PROPERLY CONFIGURED

**Analysis:**
- Connection string in environment variable: `process.env.MONGODB_URL` (server.js:45)
- Fallback to local database: `mongodb://localhost/pagine_azzurre`
- **No hardcoded credentials** ✅
- MongoDB Atlas connection string format used (with authentication) ✅

**Connection Configuration:**
```javascript
mongoose.connect(process.env.MONGODB_URL || 'mongodb://localhost/pagine_azzurre', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useCreateIndex: true,
});
```

**Security Posture:**
- ✅ Credentials not in source code
- ✅ TLS/SSL used (MongoDB Atlas default)
- ⚠️ No connection string validation
- ⚠️ No connection pooling configuration visible
- ⚠️ No connection timeout configured

**Recommendations:**
- Add connection string validation (check for required parameters)
- Configure connection pooling for production
- Add connection retry logic with exponential backoff
- Monitor for connection anomalies

---

### 3.2 Database Authentication Mechanisms

**MongoDB Authentication:** ✅ ASSUMED CONFIGURED (Atlas)

**Analysis:**
- MongoDB Atlas (cloud) likely uses:
  - Username/password authentication ✅
  - IP whitelisting (should be configured) ⚠️
  - TLS encryption ✅
- Local development: **No authentication** ⚠️

**User Roles:**
- Application uses single database user (assumed read/write)
- **No principle of least privilege** ⚠️
- **No separate roles for different operations** ⚠️

**Recommendations:**
- Configure separate MongoDB users for:
  - Application (read/write on application collections)
  - Backups (read-only)
  - Analytics (read-only)
- Enable MongoDB audit logging
- Implement IP whitelisting for production database
- Enable MongoDB encryption at rest (Atlas feature)

---

### 3.3 Query Parameterization (NoSQL Injection Prevention)

**Implementation:** ✅ MOSTLY SAFE

**Analysis:**

All database queries use Mongoose ODM, which provides built-in protection against NoSQL injection. Analysis of query patterns:

**Safe Queries (✅):**
```javascript
// Using Mongoose methods with object parameters
User.findOne({ email: req.body.email })  // Safe - object parameter
User.findById(req.params.id)  // Safe - string parameter
Order.find({ user: req.user._id })  // Safe - object parameter
Product.find({
  ...sellerFilter,
  ...nameFilter,
  ...categoryFilter
})  // Safe - spread objects
```

**Potentially Vulnerable Queries (⚠️):**
```javascript
// productRouter.js:40 - Regex from user input
const nameFilter = name 
  ? { name: { $regex: query.trim(), $options: 'i' } } 
  : { name: { $not: { $regex: 'Annunciø' } } };

// This could allow ReDoS attacks with malicious regex patterns
```

**Direct Parameter Usage:**
- `req.body.email` → Validated by express-validator ✅
- `req.params.id` → MongoDB ObjectId (safe) ✅
- `req.query.name` → Used in $regex **without escaping** ⚠️

**Validation:**
- express-validator used for input validation ✅
- Validators check format, length, and patterns ✅
- **No regex escaping for search queries** ⚠️

**ReDoS Attack Surface:**
```javascript
// Example malicious input:
// req.query.name = "(a+)+" 
// Could cause catastrophic backtracking
```

**Recommendations:**
1. Escape regex special characters in search queries:
   ```javascript
   function escapeRegex(text) {
     return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
   }
   const nameFilter = name 
     ? { name: { $regex: escapeRegex(query.trim()), $options: 'i' } } 
     : { name: { $not: { $regex: 'Annunciø' } } };
   ```
2. Implement query timeout limits
3. Use MongoDB text search indexes instead of regex for full-text search
4. Add rate limiting to search endpoints

---

### 3.4 Field-Level Access Controls

**Implementation:** ⚠️ PARTIAL

**toJSON() Method Protection:**
- File: userModel.js:46-52
- **Automatically excludes sensitive fields:** ✅
  - `accountKey` (private key)
  - `password` (hashed password)
  - `recoveryPasswordId` (password recovery token)

```javascript
userSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.accountKey;
  delete user.password;
  delete user.recoveryPasswordId;
  return user;
};
```

**Effectiveness:**
- ✅ Used consistently in user queries:
  - `user.toJSON()` (Line 207, 329, 346, 367)
  - `topSellers.map(seller => seller.toJSON())` (Line 48)
- ✅ Prevents accidental exposure in API responses
- ⚠️ **Not applied to Order or Product models** (but they don't have sensitive fields)

**Gaps:**
1. **CF and Partita IVA not filtered:** Still exposed in API responses
2. **Phone numbers not filtered:** Exposed to all authenticated users
3. **Email addresses not filtered:** Visible in user profiles
4. **No granular field-level permissions:** All or nothing approach

**Selective Field Exposure:**
- Login response: Manually constructs response object (Line 80-100) ✅
- Profile update: Manually constructs response object (Line 253-272) ✅
- This is good practice but verbose

**Recommendations:**
1. Add toJSON() filtering for CF/Partita IVA:
   ```javascript
   userSchema.methods.toJSON = function() {
     const user = this.toObject();
     delete user.accountKey;
     delete user.password;
     delete user.recoveryPasswordId;
     // Optionally mask sensitive PII
     if (user.cf) user.cf = user.cf.slice(0, 4) + '********' + user.cf.slice(-2);
     return user;
   };
   ```
2. Implement field-level access control based on user role
3. Create separate methods for public vs. authenticated user views

---

### 3.5 Sensitive Data Filtering

**API Response Filtering:** ✅ IMPLEMENTED

**Consistency:**
- User endpoints: ✅ Consistently use toJSON()
- Product endpoints: ✅ Don't expose sensitive data (no PII in products)
- Order endpoints: ⚠️ Expose full shipping addresses to order owners

**Email Template Filtering:**
- File: mailMsg.js
- ✅ Uses escapeHtml() to prevent XSS (Lines 2-10)
- ✅ Sanitizes all user input before including in emails
- ⚠️ **Exposes email and phone numbers to transaction counterparties**

**Example from Order Notifications:**
```javascript
// mailMsg.js:183-185 - Seller receives buyer's contact info
${safeBuyerUsername}</p><p>Email:
${safeBuyerEmail}</p><p>Telefono:
${safeShippingPhone !== buyer[0].email && orderdetails.shippingAddress.phone !== '' 
  ? safeShippingPhone 
  : safeBuyerPhone !== buyer[0].email ? safeBuyerPhone : 'Non Disponibile'}</p>
```

**Privacy Concern:**
- Both buyer and seller receive each other's:
  - Email address
  - Phone number
  - Username
- This is **necessary for order fulfillment** but should be explicitly consented to

**Recommendations:**
1. Add privacy policy clause about data sharing during transactions
2. Allow users to use alias email/phone for orders (forwarding service)
3. Implement in-app messaging to avoid exposing direct contact info
4. Add option for users to hide phone number (rely on email only)

---

## 4. DATA FLOW TRACING

### 4.1 Blockchain Private Key Flow

**Data Type:** Blockchain Private Key (accountKey)  
**Sensitivity Level:** CRITICAL

**Flow Diagram:**
```
Registration Form (frontend)
    ↓ HTTPS (password in body)
POST /api/users/register (userRouter.js:109)
    ↓ Input validation (validators.js:19)
    ↓ Password hashed with bcrypt (userRouter.js:115)
    ↓ Private key generated: web3.eth.accounts.create(hashedPw + ENTROPY)
    ↓ STORED IN PLAINTEXT (userModel.js:6) ❌
MongoDB - users collection
    ↓ accountKey field (String, unique)
    ↓ Retrieved for payment processing
Payment Endpoint (paymentRouter.js:14)
    ↓ Query: User.find({ email: req.user.email })
    ↓ Extract: buyer[0].accountKey (Line 22)
    ↓ Use: new HDWalletProvider([buyerPvKey], InfuraUrl)
    ↓ Sign transaction on blockchain
Blockchain (Goerli Testnet / Mainnet)
```

**Protection at Each Stage:**

| Stage | Protection | Status |
|-------|-----------|--------|
| Input (form) | HTTPS | ⚠️ Not enforced |
| Generation | Deterministic from password + entropy | ✅ Secure |
| Storage | **NONE** | ❌ CRITICAL |
| Retrieval | Database auth only | ⚠️ Weak |
| Usage | HDWalletProvider (in-memory) | ✅ Safe |
| Output (API) | Filtered by toJSON() | ✅ Safe |

**Vulnerabilities:**
1. **Database breach:** All private keys exposed → all funds stolen
2. **Backup exposure:** Old database backups contain keys
3. **Memory dumps:** Keys briefly in application memory during payment
4. **Log files:** Error logs might expose keys (not observed, but possible)
5. **Admin access:** MongoDB admins can export keys

**Mitigations Required:**
- **Immediate:** Encrypt accountKey field with AES-256-GCM
- **Short-term:** Migrate to custodial wallet service
- **Long-term:** Implement non-custodial wallet (user controls keys)

---

### 4.2 Password Flow

**Data Type:** User Password  
**Sensitivity Level:** CRITICAL

**Flow Diagram:**
```
Registration/Login Form
    ↓ HTTPS (password in body)
POST /api/users/register OR POST /api/users/signin
    ↓ Input validation (min 8 chars, uppercase, lowercase, digit)
    ↓ Hash with bcrypt (8 salt rounds)
    ↓ Stored as hash
MongoDB - users collection (password field)
    ↓ Retrieved for verification
    ↓ bcrypt.compareSync(inputPassword, storedHash)
    ✅ Hash never leaves database
JWT Token Generated
    ↓ Signed with JWT_SECRET
    ↓ Returned to client
Client stores JWT in localStorage/cookies
    ↓ Sent in Authorization header for subsequent requests
    ↓ Verified by isAuth middleware (utils.js:41)
```

**Protection at Each Stage:**

| Stage | Protection | Status |
|-------|-----------|--------|
| Input (form) | HTTPS, validation | ✅ Good |
| Hashing | bcrypt with 8 rounds | ⚠️ Low rounds |
| Storage | bcrypt hash | ✅ Good |
| Verification | bcrypt.compareSync | ✅ Good |
| Output (API) | Filtered by toJSON() | ✅ Good |
| Logging | Not logged | ✅ Good |

**Password Recovery Flow:**
```
POST /api/users/password-recovery (userRouter.js:410)
    ↓ Generate token: Web3.utils.keccak256(user.password)
    ↓ Store in user.recoveryPasswordId
    ↓ Send email with token link
    ↓ User clicks link with token
POST /api/users/password-replacement (userRouter.js:433)
    ↓ Verify token matches user.recoveryPasswordId
    ↓ Hash new password with bcrypt
    ↓ Clear recoveryPasswordId
    ↓ Send confirmation email
```

**Recovery Flow Security:**
- ✅ Token is hash of current password (changes if password already changed)
- ✅ Token cleared after use (single-use)
- ⚠️ **Token never expires** (should have TTL)
- ⚠️ No rate limiting on recovery endpoint (brute force possible)

**Recommendations:**
1. Add expiration timestamp for password recovery tokens
2. Implement rate limiting on password recovery endpoint
3. Increase bcrypt rounds to 10-12
4. Add password history to prevent reuse

---

### 4.3 Italian Tax Code (CF) Flow

**Data Type:** Codice Fiscale (CF)  
**Sensitivity Level:** HIGH

**Flow Diagram:**
```
Registration/Profile Update Form
    ↓ HTTPS
POST /api/users/register OR PUT /api/users/profile
    ↓ Input validation (16 chars, format check)
    ↓ Converted to uppercase
    ↓ STORED IN PLAINTEXT
MongoDB - users collection (cf field)
    ↓ Retrieved on profile fetch
    ↓ Included in API response (NOT FILTERED) ⚠️
Client receives CF in user object
```

**Protection at Each Stage:**

| Stage | Protection | Status |
|-------|-----------|--------|
| Input | HTTPS, format validation | ✅ Good |
| Storage | **NONE** | ❌ Plaintext |
| Retrieval | Auth required (own profile) | ⚠️ Weak |
| Output (API) | **NOT FILTERED** | ❌ Exposed |
| Logging | Not logged | ✅ Good |

**Usage:**
- Required for user to become an "offerer" (utils.js:34-38):
  ```javascript
  export const userBecomesOfferer = (user) => {
    if (user.name && user.surname && user.birthday && user.birthplace && user.gender && user.cf){
      return true
    }
    return false
  }
  ```
- **Purpose:** Verify identity for commercial transactions
- **Legal basis:** Contract performance (GDPR Article 6(1)(b))

**GDPR Compliance:**
- ⚠️ **No explicit consent for CF collection**
- ⚠️ **No privacy policy link during registration**
- ⚠️ **No data minimization analysis** (is CF required for all users?)
- ⚠️ **CF not masked in API responses**

**Recommendations:**
1. Add explicit consent checkbox for CF collection during registration
2. Encrypt CF field at rest using deterministic encryption (for uniqueness check)
3. Mask CF in API responses (show first 4 and last 2 chars): `RSSMRA80A01H501*` → `RSSM***********01`
4. Only require CF for users who want to sell (not all users)
5. Add link to privacy policy explaining why CF is collected

---

### 4.4 Email Address Flow

**Data Type:** Email Address  
**Sensitivity Level:** MEDIUM

**Flow Diagram:**
```
Registration Form
    ↓ HTTPS
POST /api/users/register
    ↓ Validation (email format, normalization)
    ↓ Uniqueness check (User.findOne({ email }))
    ↓ STORED IN PLAINTEXT
MongoDB - users collection (email field)
    ↓ Used for authentication (login by email)
    ↓ Used for communications (SendGrid)
    ↓ Returned in API responses
    ↓ EXPOSED TO TRANSACTION COUNTERPARTIES
Order notification emails
    ↓ Buyer's email sent to seller
    ↓ Seller's email sent to buyer
```

**Protection at Each Stage:**

| Stage | Protection | Status |
|-------|-----------|--------|
| Input | Validation, normalization | ✅ Good |
| Storage | Plaintext (indexed for login) | ⚠️ Acceptable |
| Retrieval | Auth required | ✅ Good |
| Output (API) | Visible in user profiles | ⚠️ Expected |
| Email notifications | **SHARED WITH COUNTERPARTIES** | ⚠️ Privacy concern |

**Email Sharing in Transactions:**
- **Order notification to seller** (mailMsg.js:183-185):
  ```
  Username: ${safeBuyerUsername}
  Email: ${safeBuyerEmail}
  ```
- **Order notification to buyer** (mailMsg.js:212-214):
  ```
  Username: ${safeOffererUsername}
  Email: ${safeOffererEmail}
  ```

**Privacy Analysis:**
- **Necessary for order fulfillment:** Parties need to communicate ✅
- **No in-app messaging alternative:** Email only communication method ❌
- **No option to use alias email:** Direct email always exposed ❌

**Newsletter Subscription Flow:**
```
POST /api/users/newsletter (userRouter.js:467)
    ↓ Separate Newsletter collection
    ↓ Verified flag (requires confirmation)
    ↓ Can unsubscribe (GDPR compliance) ✅
```

**Recommendations:**
1. Implement in-app messaging system to avoid exposing direct email
2. Offer alias email addresses for transactions (e.g., buyer123@pagineazzurre.net forwards to real email)
3. Add privacy notice during checkout explaining email will be shared
4. Allow users to opt-out of email sharing (use in-app messaging only)

---

### 4.5 Phone Number Flow

**Data Type:** Phone Number  
**Sensitivity Level:** MEDIUM

**Flow Diagram:**
```
Registration/Profile Update Form
    ↓ HTTPS
POST /api/users/register OR PUT /api/users/profile
    ↓ Validation (phone format)
    ↓ STORED IN PLAINTEXT
MongoDB - users collection (phone field)
    ↓ Also stored in Order shipping addresses
    ↓ Retrieved on profile fetch
    ↓ EXPOSED TO TRANSACTION COUNTERPARTIES
Order notification emails
    ↓ Buyer's phone sent to seller
    ↓ Seller's phone sent to buyer
```

**Protection at Each Stage:**

| Stage | Protection | Status |
|-------|-----------|--------|
| Input | Format validation | ✅ Good |
| Storage | Plaintext | ⚠️ Acceptable |
| Retrieval | Auth required | ✅ Good |
| Output (API) | Visible in profiles | ⚠️ Expected |
| Email notifications | **SHARED WITH COUNTERPARTIES** | ⚠️ Privacy concern |

**Phone Sharing in Transactions:**
- **Fallback logic** (mailMsg.js:185):
  ```javascript
  ${ safeShippingPhone !== buyer[0].email && orderdetails.shippingAddress.phone !== '' 
    ? safeShippingPhone 
    : safeBuyerPhone !== buyer[0].email ? safeBuyerPhone : 'Non Disponibile'}
  ```
- Shows shipping phone if provided, otherwise profile phone, otherwise "Not Available"

**Privacy Concern:**
- **Phone numbers always shared in orders** unless omitted ⚠️
- **No option to hide phone number** ❌
- **No phone masking** (e.g., +39 ****** 1234) ❌

**Recommendations:**
1. Allow users to mark phone as "private" (not shared with counterparties)
2. Implement phone masking for non-transaction contexts
3. Add in-app calling feature using VoIP (hide real phone numbers)
4. Make phone optional for all transactions (rely on email only)

---

### 4.6 Shipping Address Flow

**Data Type:** Physical Address  
**Sensitivity Level:** MEDIUM

**Flow Diagram:**
```
Checkout Form
    ↓ HTTPS
POST /api/orders
    ↓ Validation (address, city, postal code)
    ↓ Geolocation (lat, lng) stored but NOT validated ⚠️
    ↓ STORED IN PLAINTEXT
MongoDB - orders collection (shippingAddress embedded)
    ↓ Retrieved on order fetch
    ↓ Visible to order owner and seller
    ↓ NOT sent in emails ✅
```

**Protection at Each Stage:**

| Stage | Protection | Status |
|-------|-----------|--------|
| Input | Validation (format, length) | ✅ Good |
| Storage | Plaintext | ⚠️ Acceptable |
| Retrieval | Auth + ownership check | ⚠️ See Section 6 |
| Output (API) | Only to order parties | ✅ Good |
| Email notifications | **NOT INCLUDED** | ✅ Good privacy practice |

**Geolocation Data:**
- **Lat/lng coordinates stored** (orderModel.js:26-27)
- **No validation or bounds checking** ⚠️
- **GDPR Article 4(1):** Location data is personal data
- **Purpose unclear:** Not used for distance calculation in code

**Data Retention:**
- **No automatic deletion:** Old addresses persist indefinitely ❌
- **No retention policy:** GDPR requires time-limited storage

**Recommendations:**
1. Validate lat/lng coordinates (bounds checking)
2. Document purpose for collecting geolocation data
3. Implement data retention policy (delete addresses after X years)
4. Allow users to delete old addresses from closed orders
5. Consider not storing lat/lng if not actively used

---

## 5. PII HANDLING & GDPR COMPLIANCE

### 5.1 Data Minimization

**Principle:** Only collect data necessary for service provision

**Analysis:**

| Data Field | Required? | Purpose | Minimization Status |
|------------|-----------|---------|-------------------|
| Email | ✅ Yes | Authentication, communication | ✅ Justified |
| Password | ✅ Yes | Authentication | ✅ Justified |
| Username | ✅ Yes | Public identifier | ✅ Justified |
| Phone | ⚠️ Optional | Order communication | ⚠️ Should be truly optional |
| CF (tax code) | ⚠️ Optional | Identity verification for sellers | ⚠️ Only for sellers, not all users |
| Partita IVA | ⚠️ Optional | Business sellers | ⚠️ Only for business sellers |
| Name | ⚠️ Optional | Personalization | ⚠️ Not required for service |
| Surname | ⚠️ Optional | Personalization | ⚠️ Not required for service |
| **Birthday** | ❌ **Not justified** | Unknown | ❌ **Excessive** |
| **Birthplace** | ❌ **Not justified** | Unknown | ❌ **Excessive** |
| Gender | ⚠️ Optional | Unknown | ⚠️ Not clearly justified |
| City | ⚠️ Optional | Product filtering by location | ✅ Justified for sellers |
| Shipping address | ✅ Yes | Order fulfillment | ✅ Justified (per order) |
| Geolocation (lat/lng) | ❌ **Not used** | Unknown | ❌ **Excessive** |

**Excessive Data Collection:**
1. **Birthday (userModel.js:10):** No apparent use in codebase
   - Not used for age verification
   - Not used for birthday promotions
   - **Recommendation:** Remove unless justified
2. **Birthplace (userModel.js:11):** No apparent use
   - **Recommendation:** Remove unless justified
3. **Gender (userModel.js:12):** No apparent use
   - **Recommendation:** Remove or justify

**Conditional Collection:**
- CF should only be collected when user wants to become a seller
- Partita IVA should only be collected for business sellers
- Current implementation: Collected during registration (excessive)

**Recommendations:**
1. Remove birthday, birthplace, gender fields (or justify and document)
2. Only collect CF when user enables selling functionality
3. Make phone truly optional (not required for any flows)
4. Add data minimization statement to privacy policy

---

### 5.2 Consent Mechanisms

**Newsletter Consent:** ✅ IMPLEMENTED

**Implementation:**
- Checkbox during registration (frontend)
- Stored in Newsletter collection with `verified` flag
- Requires email confirmation (userRouter.js:498)
- Can be updated (userRouter.js:517)

**Analysis:**
- ✅ Opt-in consent (not pre-checked)
- ✅ Separate from registration (can register without newsletter)
- ✅ Confirmation email sent (double opt-in)
- ⚠️ **No unsubscribe link in emails** ❌
- ⚠️ **No unsubscribe endpoint** ❌

**Terms of Service / Privacy Policy:**
- ❌ **No consent checkbox for terms during registration**
- ❌ **No link to privacy policy in registration form**
- ❌ **No consent logging** (when user agreed, to what version)

**Data Processing Consent:**
- ❌ **No explicit consent for CF/Partita IVA processing**
- ❌ **No consent for email/phone sharing in transactions**
- ❌ **No consent for geolocation data collection**

**GDPR Article 7 Requirements:**
- **Freely given:** ✅ Newsletter is optional
- **Specific:** ⚠️ General consent missing, not specific per purpose
- **Informed:** ❌ No privacy policy link
- **Unambiguous:** ⚠️ Unclear for some data types
- **Withdrawable:** ❌ No easy way to withdraw consent

**Recommendations:**
1. Add Terms of Service and Privacy Policy consent checkbox during registration
2. Add unsubscribe link to all marketing emails
3. Create unsubscribe endpoint: `POST /api/users/newsletter/unsubscribe`
4. Log consent events (timestamp, version of terms, IP address)
5. Add granular consent for:
   - Email/phone sharing in transactions
   - Geolocation data collection
   - Marketing communications
6. Implement consent management dashboard in user profile

---

### 5.3 Data Retention

**Current Status:** ❌ NO RETENTION POLICY

**Analysis:**

| Data Type | Retention Policy | Actual Retention | GDPR Compliance |
|-----------|------------------|------------------|-----------------|
| User accounts | None | Indefinite | ❌ Non-compliant |
| Orders | None | Indefinite | ⚠️ May be acceptable for legal reasons |
| Shipping addresses | None | Indefinite (in orders) | ❌ Excessive |
| Newsletter subscriptions | None | Indefinite | ⚠️ Until unsubscribe |
| Password recovery tokens | None | Until used (good) | ✅ Acceptable |

**Issues:**
1. **Inactive accounts:** No automatic deletion of unused accounts
2. **Old orders:** Orders from years ago persist with PII
3. **Deleted accounts:** When user is deleted, their orders remain (orphaned data)
4. **No data lifecycle policy**

**Legal Retention Requirements (Italy):**
- **Accounting records:** 10 years (for tax purposes)
- **Order data for businesses:** May need to retain for legal/tax reasons
- **Personal data:** Only as long as necessary for purpose

**Recommendations:**
1. Define retention periods:
   - Active user data: Until account deletion + 30 days
   - Closed orders: 10 years (legal requirement for businesses)
   - Inactive accounts: Auto-delete after 3 years of inactivity (with warning)
   - Newsletter subscriptions: Until unsubscribe + 30 days
2. Implement automated deletion workflows:
   - Anonymize orders after retention period (remove PII, keep aggregated data)
   - Send warning emails before account deletion
   - Pseudonymize old data (replace names/emails with hashes)
3. Document retention policy in privacy policy
4. Add "account inactive since" field to User model

---

### 5.4 Data Portability (GDPR Article 20)

**Current Status:** ❌ NOT IMPLEMENTED

**Requirements:**
- Users have right to receive their personal data in structured, machine-readable format
- Users have right to transmit data to another controller

**Missing Features:**
1. **No data export endpoint:** No way for users to download their data
2. **No data export format:** Should be JSON, CSV, or XML
3. **No data package:** Should include all user data (profile, orders, reviews)

**Recommended Implementation:**
```javascript
// GET /api/users/profile/export
userRouter.get(
  '/profile/export',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);
    const orders = await Order.find({ user: req.user._id });
    const products = await Product.find({ seller: req.user._id });
    const reviews = await Product.find({ 'reviews.name': user.username });
    
    const dataPackage = {
      exportDate: new Date().toISOString(),
      personalData: {
        username: user.username,
        email: user.email,
        name: user.name,
        surname: user.surname,
        cf: user.cf,
        phone: user.phone,
        city: user.city,
        // DO NOT include password or accountKey
      },
      orders: orders.map(o => ({
        id: o._id,
        date: o.createdAt,
        items: o.orderItems,
        total: o.totalPriceEuro
      })),
      products: products.map(p => ({
        name: p.name,
        category: p.category,
        createdAt: p.createdAt
      })),
      reviews: reviews.map(r => r.reviews.filter(rv => rv.name === user.username))
    };
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="my-data.json"');
    res.send(dataPackage);
  })
);
```

**Recommendations:**
1. Implement data export endpoint
2. Add "Download My Data" button in user profile
3. Include all personal data in export (except password hash and private key)
4. Support JSON format (most portable)
5. Log data export requests (for audit trail)

---

### 5.5 Logging Sensitive Data

**Current Status:** ✅ MOSTLY SAFE

**Analysis:**

**Console Logs Found:**
```javascript
// userRouter.js:188 - User object logged
console.log("Created User: ", createdUser)
// ⚠️ May include sensitive fields if toJSON() not applied

// paymentRouter.js:20 - Blockchain address logged
console.log(seller[0].account)
// ✅ Public address, not sensitive

// orderRouter.js:158 - Request body logged
console.log("mailing", req.body)
// ⚠️ May include shipping address, phone, email
```

**Sensitive Data in Logs:**
1. **User creation:** Full user object logged (Line 188)
   - Includes: email, username, phone, CF
   - **Does NOT include:** password (hashed), accountKey (excluded by toJSON)
   - Status: ⚠️ PII in logs
2. **Order details:** Request body logged (Line 158, 175)
   - Includes: shipping address, phone, email
   - Status: ⚠️ PII in logs
3. **Product filtering:** Debug logs (Line 97, 99)
   - Status: ✅ No sensitive data

**Error Messages:**
- Generic error messages used (good practice) ✅
- No stack traces sent to client (Line 76: `res.status(500).send({ message: err.message })`)
- **Potential issue:** err.message might contain sensitive data ⚠️

**Log Management:**
- ❌ **No log sanitization:** PII written directly to logs
- ❌ **No log rotation policy**
- ❌ **No log access controls documented**
- ❌ **No log retention policy**

**Recommendations:**
1. Remove console.log statements for user objects:
   ```javascript
   // Instead of:
   console.log("Created User: ", createdUser)
   // Use:
   console.log("Created User: ", createdUser._id, createdUser.username)
   ```
2. Implement structured logging with PII redaction:
   ```javascript
   const sanitizeForLog = (obj) => {
     const safe = { ...obj };
     delete safe.password;
     delete safe.accountKey;
     delete safe.email;
     delete safe.phone;
     delete safe.cf;
     if (safe.shippingAddress) {
       safe.shippingAddress = { city: safe.shippingAddress.city };
     }
     return safe;
   };
   console.log("Created User:", sanitizeForLog(createdUser));
   ```
3. Use a proper logging library (Winston, Pino) with:
   - Log levels (debug, info, warn, error)
   - Automatic PII redaction
   - Log rotation
   - Centralized log management
4. Never log:
   - Passwords (even hashed)
   - Private keys
   - Full credit card numbers (if added in future)
   - Full tax IDs
5. Redact PII in production logs:
   - Email: `user@example.com` → `u***@e***.com`
   - Phone: `+39 123 456 7890` → `+39 *** *** **90`
   - Address: `Via Roma 123` → `Via Roma ***`

---

### 5.6 Right to Erasure (GDPR Article 17)

**Current Status:** ⚠️ PARTIAL IMPLEMENTATION

**User Deletion Endpoint:**
- File: userRouter.js:334-351
- Endpoint: `DELETE /api/users/:id`
- Authorization: ✅ Admin only (isAuth + isAdmin)

**Implementation Analysis:**
```javascript
userRouter.delete(
  '/:id',
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);
    if (user) {
      if (user.email === 'admin@example.com') {
        res.status(400).send({ message: 'Can Not Delete Admin User' });
        return;
      }
      const deleteUser = await user.remove();
      res.send({ message: 'User Deleted', user: deleteUser.toJSON() });
    } else {
      res.status(404).send({ message: 'User Not Found' });
    }
  })
);
```

**Issues:**
1. ❌ **Admin-only deletion:** Users cannot delete their own accounts
2. ❌ **No self-service deletion:** Violates GDPR Article 17
3. ⚠️ **Orphaned data:** Deleting user doesn't delete/anonymize:
   - Orders (contain shipping addresses, phone numbers)
   - Products (linked to deleted seller)
   - Reviews (contain username)
   - Newsletter subscription (separate collection)
4. ❌ **No deletion confirmation:** No email sent to confirm deletion
5. ❌ **No grace period:** Immediate deletion (should have 30-day recovery period)

**Cascading Deletion Required:**
```javascript
// Pseudo-code for proper user deletion
async function deleteUserWithCascade(userId) {
  const user = await User.findById(userId);
  
  // 1. Anonymize orders (don't delete, keep for business records)
  await Order.updateMany(
    { user: userId },
    { 
      $set: { 
        'shippingAddress.fullName': 'Deleted User',
        'shippingAddress.phone': '',
        'paymentResult.email_address': 'deleted@example.com'
      }
    }
  );
  
  // 2. Delete or anonymize products
  await Product.updateMany(
    { seller: userId },
    { $set: { seller: null } }
  );
  
  // 3. Anonymize reviews
  await Product.updateMany(
    { 'reviews.name': user.username },
    { $set: { 'reviews.$.name': 'Deleted User' } }
  );
  
  // 4. Delete newsletter subscription
  await Newsletter.deleteOne({ email: user.email });
  
  // 5. Finally, delete user
  await user.remove();
}
```

**Recommendations:**
1. **Implement self-service account deletion:**
   ```javascript
   // POST /api/users/profile/delete
   userRouter.post(
     '/profile/delete',
     isAuth,
     expressAsyncHandler(async (req, res) => {
       const user = await User.findById(req.user._id);
       // Send confirmation email
       user.deletionRequestedAt = Date.now();
       await user.save();
       // Schedule deletion in 30 days
       res.send({ message: 'Account deletion requested. You have 30 days to cancel.' });
     })
   );
   ```
2. **Implement 30-day grace period:** Allow users to cancel deletion
3. **Anonymize rather than delete:** Replace PII with placeholders to preserve business records
4. **Send confirmation emails:**
   - When deletion is requested
   - 7 days before deletion (reminder to cancel)
   - When deletion is completed
5. **Create deletion audit log:** Record when and why accounts were deleted
6. **Handle cascading deletion/anonymization:**
   - Orders: Anonymize shipping info, keep transaction records
   - Products: Transfer to "deleted seller" account or mark as orphaned
   - Reviews: Anonymize reviewer name
   - Newsletter: Completely delete

**GDPR Exemptions:**
- **Legal obligation:** May keep transaction records for tax/legal purposes (10 years in Italy)
- **Solution:** Anonymize PII but keep transaction amounts, dates for accounting

---

## 6. MULTI-TENANT DATA ISOLATION

### 6.1 User Data Isolation

**Objective:** Ensure users can only access their own data

**Profile Access Control:**
```javascript
// userRouter.js:201-219 - GET /api/users/:id
userRouter.get(
  '/:id',
  expressAsyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);
    // ⚠️ NO AUTHORIZATION CHECK
    // Any user can fetch any other user's profile by ID
    if (user) {
      const userData = user.toJSON();
      res.send(userData)
    }
  })
);
```

**Vulnerability:**
- ❌ **No authentication required:** Endpoint is public
- ❌ **No authorization check:** Any user can access any profile
- ⚠️ **Mitigated by toJSON():** Sensitive fields (password, accountKey) are filtered
- ⚠️ **PII still exposed:** Email, phone, CF visible to all authenticated users

**Severity:** MEDIUM
- Sensitive financial data (accountKey) is protected by toJSON()
- But PII (email, phone, CF) is unnecessarily exposed to all users

**Recommendation:**
```javascript
userRouter.get(
  '/:id',
  isAuth,  // Add authentication
  expressAsyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);
    if (user) {
      const userData = user.toJSON();
      
      // If requesting own profile, return all data
      if (req.user._id.toString() === user._id.toString()) {
        res.send(userData);
      } else {
        // For other users, return limited public profile
        res.send({
          _id: userData._id,
          username: userData.username,
          seller: userData.seller,
          isSeller: userData.isSeller
        });
      }
    } else {
      res.status(404).send({ message: 'User Not Found' });
    }
  })
);
```

**Profile Update Control:**
```javascript
// userRouter.js:221-275 - PUT /api/users/profile
userRouter.put(
  '/profile',
  isAuth,  // ✅ Authentication required
  validateProfileUpdate,
  expressAsyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);  // ✅ Uses authenticated user's ID
    // User can only update their own profile
    // ...
  })
);
```

**Assessment:** ✅ SECURE
- Uses `req.user._id` from JWT token (cannot be spoofed)
- Users can only update their own profile

---

### 6.2 Order Data Isolation

**Order List Access:**
```javascript
// orderRouter.js:16-30 - GET /api/orders
orderRouter.get(
  '/',
  isAuth,
  isSellerOrAdmin,  // ✅ Role-based access
  expressAsyncHandler(async (req, res) => {
    const seller = req.query.seller || '';
    const sellerFilter = seller ? { seller } : {};
    
    const orders = await Order.find({ ...sellerFilter }).populate(
      'user',
      'name'
    );
    res.send(orders);
  })
);
```

**Vulnerability:**
- ⚠️ **Weak authorization:** Sellers can see ALL orders, not just their own
- ❌ **Missing seller ownership check:** Any seller can query `?seller=<any_seller_id>`
- ❌ **Admin sees all orders:** No filtering by seller for admins (acceptable)

**Attack Scenario:**
1. Seller A creates account
2. Seller A calls `GET /api/orders?seller=<Seller_B_ID>`
3. Seller A sees all orders for Seller B (including buyer PII)

**Severity:** HIGH
- Sellers can access orders from other sellers
- Exposes buyer PII (shipping addresses, phone numbers, emails)

**Proof of Concept:**
```javascript
// Attacker (Seller A) requests orders from Seller B
GET /api/orders?seller=60d5f7f7f7f7f7f7f7f7f7f7
Authorization: Bearer <Seller_A_JWT>

// Response includes all orders for Seller B
// with buyer PII
```

**Recommendation:**
```javascript
orderRouter.get(
  '/',
  isAuth,
  isSellerOrAdmin,
  expressAsyncHandler(async (req, res) => {
    let sellerFilter = {};
    
    if (req.user.isAdmin) {
      // Admins can filter by any seller
      const seller = req.query.seller || '';
      sellerFilter = seller ? { seller } : {};
    } else if (req.user.isSeller) {
      // Sellers can ONLY see their own orders
      sellerFilter = { seller: req.user._id };
    } else {
      return res.status(403).send({ message: 'Forbidden' });
    }
    
    const orders = await Order.find(sellerFilter).populate('user', 'name');
    res.send(orders);
  })
);
```

**My Orders Access:**
```javascript
// orderRouter.js:31-38 - GET /api/orders/mine
orderRouter.get(
  '/mine',
  isAuth,  // ✅ Authentication required
  expressAsyncHandler(async (req, res) => {
    const orders = await Order.find({ user: req.user._id });  // ✅ Uses authenticated user's ID
    res.send(orders);
  })
);
```

**Assessment:** ✅ SECURE
- Users can only see their own orders
- Cannot query other users' orders

**Single Order Access:**
```javascript
// orderRouter.js:86-97 - GET /api/orders/:id
orderRouter.get(
  '/:id',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.id);
    if (order) {
      res.send(order);  // ⚠️ NO OWNERSHIP CHECK
    } else {
      res.status(404).send({ message: 'Order Not Found' });
    }
  })
);
```

**Vulnerability:**
- ❌ **No authorization check:** Any authenticated user can access any order by ID
- ❌ **PII exposed:** Shipping addresses, phone numbers, emails visible to unauthorized users

**Attack Scenario:**
1. User A places order (gets order ID `abc123`)
2. User B (attacker) calls `GET /api/orders/abc123`
3. User B sees User A's shipping address, phone, email

**Severity:** HIGH
- Any authenticated user can access any order
- Exposes sensitive PII

**Recommendation:**
```javascript
orderRouter.get(
  '/:id',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.id);
    if (order) {
      // Check if user is order owner, seller, or admin
      const isOwner = order.user.toString() === req.user._id.toString();
      const isSeller = order.seller && order.seller.toString() === req.user._id.toString();
      const isAdmin = req.user.isAdmin;
      
      if (isOwner || isSeller || isAdmin) {
        res.send(order);
      } else {
        res.status(403).send({ message: 'Forbidden: You do not have access to this order' });
      }
    } else {
      res.status(404).send({ message: 'Order Not Found' });
    }
  })
);
```

---

### 6.3 Product/Seller Data Isolation

**Product Edit Access:**
```javascript
// productRouter.js:169-221 - PUT /api/products/:id
productRouter.put(
  '/:id',
  isAuth,
  isSellerOrAdmin,  // ✅ Role check
  validateProduct,
  expressAsyncHandler(async (req, res) => {
    const productId = req.params.id;
    const product = await Product.findById(productId);
    if (product) {
      // ⚠️ NO SELLER OWNERSHIP CHECK
      // Any seller can edit any product
      product.name = req.body.name;
      // ...
      const updatedProduct = await product.save();
      res.send({ message: 'Product Updated', product: updatedProduct });
    }
  })
);
```

**Vulnerability:**
- ❌ **No seller ownership check:** Seller A can edit Seller B's products
- ⚠️ **Admin can edit all products:** Expected behavior (acceptable)

**Attack Scenario:**
1. Seller A creates product (ID: `prod123`)
2. Seller B calls `PUT /api/products/prod123` with malicious data
3. Seller B successfully edits Seller A's product (changes price, description, etc.)

**Severity:** HIGH
- Sellers can vandalize competitors' products
- Could change prices to $0 or add offensive content
- Could mark competitors' products as out of stock

**Recommendation:**
```javascript
productRouter.put(
  '/:id',
  isAuth,
  isSellerOrAdmin,
  validateProduct,
  expressAsyncHandler(async (req, res) => {
    const product = await Product.findById(req.params.id);
    if (product) {
      // Check if user is product owner or admin
      const isOwner = product.seller.toString() === req.user._id.toString();
      const isAdmin = req.user.isAdmin;
      
      if (!isOwner && !isAdmin) {
        return res.status(403).send({ 
          message: 'Forbidden: You can only edit your own products' 
        });
      }
      
      product.name = req.body.name;
      // ...
      const updatedProduct = await product.save();
      res.send({ message: 'Product Updated', product: updatedProduct });
    } else {
      res.status(404).send({ message: 'Product Not Found' });
    }
  })
);
```

**Product Delete Access:**
```javascript
// productRouter.js:223-238 - DELETE /api/products/:id
productRouter.delete(
  '/:id',
  isAuth,
  isSellerOrAdmin,
  expressAsyncHandler(async (req, res) => {
    const product = await Product.findById(req.params.id);
    if (product) {
      // ⚠️ NO SELLER OWNERSHIP CHECK
      const deleteProduct = await product.remove();
      res.send({ message: 'Product Deleted', product: deleteProduct });
    }
  })
);
```

**Vulnerability:**
- ❌ **Same issue as product edit:** Any seller can delete any product

**Severity:** HIGH
- Sellers can delete competitors' products

**Apply same recommendation as product edit (ownership check).**

---

### 6.4 Database-Level Tenant Boundaries

**Current Architecture:** ❌ NO DATABASE-LEVEL ISOLATION

**Analysis:**
- All users in same `users` collection
- All orders in same `orders` collection
- All products in same `products` collection
- **No database-level multi-tenancy** (acceptable for this architecture)

**Application-Level Isolation:**
- ✅ JWT-based authentication
- ⚠️ **Weak authorization checks** (see sections 6.2 and 6.3)
- ⚠️ **Missing owner verification** in multiple endpoints

**Security Model:**
- **Intended:** Application-level isolation (each user sees only their data)
- **Actual:** Weak isolation due to missing authorization checks

**Recommendations:**
1. **Fix application-level authorization:**
   - Add ownership checks to all endpoints
   - Verify `req.user._id` matches resource owner
2. **Implement centralized authorization middleware:**
   ```javascript
   export const isResourceOwner = (resourceType) => {
     return async (req, res, next) => {
       let resource;
       switch (resourceType) {
         case 'order':
           resource = await Order.findById(req.params.id);
           if (!resource || 
               (resource.user.toString() !== req.user._id.toString() && 
                resource.seller.toString() !== req.user._id.toString() &&
                !req.user.isAdmin)) {
             return res.status(403).send({ message: 'Forbidden' });
           }
           break;
         case 'product':
           resource = await Product.findById(req.params.id);
           if (!resource || 
               (resource.seller.toString() !== req.user._id.toString() && 
                !req.user.isAdmin)) {
             return res.status(403).send({ message: 'Forbidden' });
           }
           break;
       }
       req.resource = resource;
       next();
     };
   };
   
   // Usage:
   orderRouter.get('/:id', isAuth, isResourceOwner('order'), ...);
   productRouter.put('/:id', isAuth, isResourceOwner('product'), ...);
   ```
3. **Add audit logging:**
   - Log all access to sensitive resources
   - Detect unauthorized access attempts
   - Alert on suspicious patterns (user trying many IDs)
4. **Consider database-level row security** (PostgreSQL RLS) for future:
   - If migrating to PostgreSQL, use Row-Level Security policies
   - MongoDB doesn't support row-level security, so application-level is required

---

## 7. CRITICAL VULNERABILITIES SUMMARY

### 7.1 P0 (Critical) - Immediate Action Required

**1. Blockchain Private Keys Stored in Plaintext**
- **Location:** userModel.js:6 (`accountKey` field)
- **Impact:** Database breach = complete financial loss for all users
- **Attack Vector:** Database dump, backup exposure, insider threat
- **Affected Users:** All registered users (~100% of user base)
- **Remediation:**
  1. **Immediate (24-48 hours):** 
     - Implement AES-256-GCM encryption for `accountKey` field
     - Use AWS KMS, HashiCorp Vault, or similar for key management
  2. **Short-term (1-2 weeks):**
     - Migrate to custodial wallet architecture with HSM
     - Rotate all private keys (generate new keys, transfer funds)
  3. **Long-term (1-3 months):**
     - Implement non-custodial wallet support (MetaMask integration)
     - Remove private key storage entirely
- **Estimated Effort:** 40-80 hours
- **Business Impact:** HIGH - Regulatory violation, potential lawsuits if breached

---

### 7.2 P1 (High) - Action Required Within 1 Week

**2. Missing Multi-Tenant Authorization Checks**
- **Location:** 
  - orderRouter.js:86 (GET /api/orders/:id - no ownership check)
  - orderRouter.js:16 (GET /api/orders - sellers can query other sellers' orders)
  - productRouter.js:169 (PUT /api/products/:id - no ownership check)
  - productRouter.js:223 (DELETE /api/products/:id - no ownership check)
  - userRouter.js:201 (GET /api/users/:id - public access to PII)
- **Impact:** Users can access/modify other users' data (orders, products, PII)
- **Attack Vector:** 
  - Guess/enumerate order IDs → access shipping addresses
  - Edit/delete competitors' products
  - Access other users' email, phone, CF
- **Affected Users:** All users (data leakage), sellers (product vandalism)
- **Remediation:**
  1. Add ownership verification to all endpoints (see Section 6 recommendations)
  2. Implement centralized authorization middleware
  3. Add audit logging for resource access
  4. Conduct security testing (enumerate IDs, test access control)
- **Estimated Effort:** 16-24 hours
- **Business Impact:** HIGH - GDPR violation, data breach, user trust loss

**3. No GDPR Compliance Mechanisms**
- **Location:** Multiple (see Section 5)
- **Impact:** 
  - No self-service account deletion (GDPR Article 17)
  - No data portability (GDPR Article 20)
  - No consent management (GDPR Article 7)
  - Excessive data collection (birthday, birthplace, geolocation)
- **Attack Vector:** GDPR enforcement action, fines up to €20M or 4% of revenue
- **Affected Users:** All EU users
- **Remediation:**
  1. Implement self-service account deletion with 30-day grace period
  2. Add data export endpoint (JSON format)
  3. Create consent management dashboard
  4. Remove unnecessary data fields (birthday, birthplace, lat/lng)
  5. Add privacy policy and terms of service acceptance
  6. Implement unsubscribe mechanism for newsletter
- **Estimated Effort:** 40-60 hours
- **Business Impact:** HIGH - Legal compliance, avoid fines

---

### 7.3 P2 (Medium) - Action Required Within 1 Month

**4. Weak Password Hashing**
- **Location:** userRouter.js:115 (bcrypt with 8 salt rounds)
- **Impact:** Passwords easier to crack in case of database breach
- **Remediation:** Increase salt rounds to 10-12, rehash on login
- **Estimated Effort:** 4-8 hours

**5. No Data-at-Rest Encryption**
- **Location:** MongoDB (no field-level encryption)
- **Impact:** PII (CF, email, phone) exposed in database dumps
- **Remediation:** Enable MongoDB Encrypted Storage Engine or client-side field-level encryption
- **Estimated Effort:** 16-24 hours

**6. No HTTPS Enforcement**
- **Location:** server.js (no HSTS headers, no HTTP redirect)
- **Impact:** Man-in-the-middle attacks possible if user visits HTTP URL
- **Remediation:** Add helmet.js with HSTS, implement HTTP→HTTPS redirect
- **Estimated Effort:** 2-4 hours

**7. NoSQL Injection via Unescaped Regex**
- **Location:** productRouter.js:40 (user input in $regex without escaping)
- **Impact:** ReDoS attacks could cause denial of service
- **Remediation:** Escape regex special characters, use MongoDB text search
- **Estimated Effort:** 4-8 hours

**8. PII in Console Logs**
- **Location:** userRouter.js:188, orderRouter.js:158
- **Impact:** PII visible in application logs (potential GDPR violation)
- **Remediation:** Implement structured logging with PII redaction
- **Estimated Effort:** 8-16 hours

**9. Long JWT Expiration (30 days)**
- **Location:** utils.js:28
- **Impact:** Stolen tokens valid for extended period
- **Remediation:** Reduce to 7 days, implement refresh tokens
- **Estimated Effort:** 8-16 hours

**10. No Data Retention Policy**
- **Location:** All models (no TTL, no deletion workflow)
- **Impact:** Indefinite storage of PII (GDPR violation)
- **Remediation:** Implement data retention policy, automated deletion/anonymization
- **Estimated Effort:** 24-40 hours

---

## 8. COMPLIANCE ASSESSMENT

### 8.1 GDPR Compliance Score

| Requirement | Status | Notes |
|-------------|--------|-------|
| **Lawful basis (Art. 6)** | ⚠️ Partial | No explicit consent for all data processing |
| **Transparency (Art. 12-14)** | ❌ Missing | No privacy policy link, no data collection notice |
| **Data subject rights (Art. 15-22)** | ❌ Missing | No access, portability, erasure mechanisms |
| **Consent (Art. 7)** | ⚠️ Partial | Newsletter consent exists, others missing |
| **Data minimization (Art. 5.1.c)** | ❌ Violated | Excessive collection (birthday, birthplace, geolocation) |
| **Storage limitation (Art. 5.1.e)** | ❌ Violated | No retention policy, indefinite storage |
| **Security (Art. 32)** | ❌ Violated | Private keys unencrypted, weak isolation |
| **Breach notification (Art. 33-34)** | ❌ Missing | No breach detection or notification process |
| **DPO (Art. 37)** | ⚠️ Unknown | Not documented |
| **Privacy by design (Art. 25)** | ❌ Violated | Security added as afterthought |

**Overall GDPR Compliance:** 🔴 **NON-COMPLIANT**

**Risk Level:** HIGH - Potential fines if reported to supervisory authority

**Immediate Actions:**
1. Appoint Data Protection Officer (or document why not required)
2. Create and publish privacy policy
3. Implement consent management
4. Add data subject rights mechanisms (access, deletion, portability)
5. Conduct Data Protection Impact Assessment (DPIA)
6. Create breach response plan
7. Implement data retention policy

---

### 8.2 PCI-DSS Equivalent (Crypto Assets)

While PCI-DSS applies to payment card data, similar principles apply to cryptocurrency:

| Control | Status | Notes |
|---------|--------|-------|
| **Encrypted storage** | ❌ Failed | Private keys in plaintext |
| **Access control** | ⚠️ Partial | Database access not restricted by principle of least privilege |
| **Audit logging** | ❌ Missing | No audit trail for private key access |
| **Network segmentation** | ⚠️ Unknown | Application architecture not documented |
| **Key management** | ❌ Failed | No HSM, no key rotation, no KMS |
| **Monitoring** | ❌ Missing | No anomaly detection for unusual transactions |

**Overall Crypto Security:** 🔴 **NON-COMPLIANT**

---

### 8.3 Italian Data Protection Law

Italy has specific requirements for tax identifier protection:

| Requirement | Status | Notes |
|-------------|--------|-------|
| **CF protection** | ❌ Failed | Stored in plaintext, exposed in API |
| **Purpose limitation** | ⚠️ Unclear | No documented purpose for CF collection |
| **Data subject consent** | ❌ Missing | No explicit consent for CF processing |
| **Garante guidelines** | ❌ Unknown | Compliance with Italian DPA guidelines not assessed |

**Recommendation:** Consult with Italian data protection lawyer for full compliance review.

---

## 9. RECOMMENDATIONS SUMMARY

### 9.1 Immediate (This Week)

1. **Encrypt blockchain private keys** (CRITICAL)
   - Implement AES-256-GCM encryption
   - Use AWS KMS or HashiCorp Vault for key management
   - Estimated effort: 40 hours

2. **Fix multi-tenant authorization** (HIGH)
   - Add ownership checks to orders, products, user profiles
   - Implement centralized authorization middleware
   - Estimated effort: 24 hours

3. **Remove excessive data collection** (HIGH)
   - Remove birthday, birthplace, gender fields (or justify)
   - Remove geolocation (lat/lng) from orders
   - Estimated effort: 8 hours

### 9.2 Short-term (This Month)

4. **Implement GDPR compliance** (HIGH)
   - Self-service account deletion
   - Data export endpoint
   - Consent management
   - Privacy policy and terms of service
   - Estimated effort: 60 hours

5. **Add HTTPS enforcement** (MEDIUM)
   - Install helmet.js with HSTS
   - HTTP to HTTPS redirect
   - Estimated effort: 4 hours

6. **Fix NoSQL injection** (MEDIUM)
   - Escape regex in search queries
   - Implement rate limiting
   - Estimated effort: 8 hours

7. **Implement PII redaction in logs** (MEDIUM)
   - Replace console.log with structured logging
   - Add PII redaction
   - Estimated effort: 16 hours

### 9.3 Long-term (Next Quarter)

8. **Migrate to non-custodial wallet** (CRITICAL)
   - MetaMask integration
   - Remove private key storage
   - Estimated effort: 80 hours

9. **Enable MongoDB encryption at rest** (MEDIUM)
   - Configure MongoDB Encrypted Storage Engine
   - Or implement client-side field-level encryption
   - Estimated effort: 24 hours

10. **Implement data retention policy** (MEDIUM)
    - Automated deletion/anonymization workflows
    - User notification before deletion
    - Estimated effort: 40 hours

11. **Add comprehensive audit logging** (MEDIUM)
    - Log all access to sensitive resources
    - Anomaly detection
    - SIEM integration
    - Estimated effort: 40 hours

12. **Conduct penetration testing** (HIGH)
    - Third-party security audit
    - Vulnerability assessment
    - Estimated effort: External vendor

---

## 10. CONCLUSION

This security audit has identified **12 critical and high-priority vulnerabilities** in the Pagine Azzurre platform, with the most severe being:

1. **Plaintext storage of blockchain private keys** (P0 - CRITICAL)
2. **Missing multi-tenant authorization checks** (P1 - HIGH)
3. **Non-compliance with GDPR** (P1 - HIGH)

The current security posture is **INSUFFICIENT for production use** with real user funds. The plaintext private key storage alone represents an **unacceptable risk** that must be addressed before onboarding additional users.

**Positive findings:**
- ✅ Passwords properly hashed with bcrypt
- ✅ Database credentials in environment variables
- ✅ Sensitive fields filtered from API responses (toJSON)
- ✅ Input validation implemented for most fields
- ✅ Email sanitization prevents XSS in email templates

**Overall Security Grade:** 🔴 **D (Failing)**

**Recommendation:** Pause new user onboarding until P0 and P1 issues are resolved. Estimated remediation time: **3-4 weeks** for critical issues, **2-3 months** for full compliance.

---

## APPENDIX A: DATA FIELD INVENTORY

| Field | Model | Type | Encryption | PII | Sensitivity | GDPR Basis |
|-------|-------|------|------------|-----|-------------|------------|
| accountKey | User | String | ❌ None | No | CRITICAL | Contract (crypto custody) |
| password | User | String | ✅ bcrypt | No | CRITICAL | Contract (authentication) |
| email | User | String | ❌ None | ✅ Yes | HIGH | Contract (communication) |
| phone | User | String | ❌ None | ✅ Yes | MEDIUM | Contract (order fulfillment) |
| cf | User | String | ❌ None | ✅ Yes | HIGH | Contract (seller verification) |
| partitaIva | User | String | ❌ None | ✅ Yes | HIGH | Contract (business sellers) |
| name | User | String | ❌ None | ✅ Yes | MEDIUM | Consent (personalization) |
| surname | User | String | ❌ None | ✅ Yes | MEDIUM | Consent (personalization) |
| birthday | User | String | ❌ None | ✅ Yes | MEDIUM | ⚠️ No clear basis |
| birthplace | User | String | ❌ None | ✅ Yes | MEDIUM | ⚠️ No clear basis |
| gender | User | String | ❌ None | ✅ Yes | LOW | ⚠️ No clear basis |
| city | User | String | ❌ None | ✅ Yes | LOW | Legitimate interest (location-based filtering) |
| zipCode | User | Number | ❌ None | ✅ Yes | LOW | Legitimate interest |
| shippingAddress | Order | Object | ❌ None | ✅ Yes | HIGH | Contract (order fulfillment) |
| lat/lng | Order | Number | ❌ None | ✅ Yes | MEDIUM | ⚠️ No clear basis |
| recoveryPasswordId | User | String | ❌ None | No | MEDIUM | Contract (password reset) |

---

## APPENDIX B: ATTACK SCENARIOS

### Scenario 1: Database Breach
**Attacker:** External (hacker who compromised database)
1. Attacker exploits vulnerability to access MongoDB (SQL injection, stolen credentials, etc.)
2. Attacker exports `users` collection
3. **Impact:**
   - ❌ All blockchain private keys exposed (accountKey field in plaintext)
   - ❌ Attacker drains all user wallets
   - ⚠️ All emails, phones, CF exposed (GDPR breach)
   - ✅ Passwords are safe (hashed with bcrypt)
4. **Estimated damage:** €X,XXX,XXX (all user funds) + GDPR fines up to €20M

### Scenario 2: Unauthorized Order Access
**Attacker:** Malicious authenticated user
1. User creates account, gets JWT token
2. User enumerates order IDs: `GET /api/orders/60d5f7f7f7f7f7f7f7f7f7f7`, `GET /api/orders/60d5f7f7f7f7f7f7f7f7f7f8`, etc.
3. **Impact:**
   - ⚠️ Attacker accesses other users' shipping addresses
   - ⚠️ Attacker accesses phone numbers, emails
   - ⚠️ Privacy violation (GDPR breach)
4. **Estimated damage:** GDPR fine + reputation damage

### Scenario 3: Product Vandalism
**Attacker:** Malicious seller
1. Seller A creates account
2. Seller A finds Seller B's product ID
3. Seller A calls `PUT /api/products/<Seller_B_product_ID>` with offensive content
4. **Impact:**
   - ⚠️ Seller B's product defaced
   - ⚠️ Product price changed to €0 or €999,999
   - ⚠️ Platform reputation damaged
5. **Estimated damage:** Lost sales + user trust

---

**End of Data Security Audit Report**
