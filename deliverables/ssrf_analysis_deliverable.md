# SSRF/External Request Trace Analysis

**Application:** Pagine Azzurre - Next.js 16 + Express.js E-commerce Marketplace  
**Analysis Date:** 2026-04-14  
**Scope:** Network-accessible code (API routes, server components, backend endpoints)

---

## Executive Summary

This analysis identified **5 SSRF sinks** where server-side requests are made to external services. All identified sinks involve **hardcoded destination URLs** (SendGrid, Mailtrap, AWS S3, Infura blockchain RPC) rather than user-controlled URLs. 

**Critical Finding:** Email addresses in order notifications and registration flows are user-controlled and could potentially be exploited for email header injection or spam relay, though not traditional SSRF.

**Key Result:** No traditional SSRF vulnerabilities (user-controlled request URLs) were found in network-accessible code.

---

## SSRF Sinks Identified

### 1. SendGrid Email Service (Backend - Express.js)

**Sink Type:** sgMail.send() - Third-party API request  
**Files:**
- `/Users/chocos/Desktop/pagine_azzurre/backend/routers/orderRouter.js`
- `/Users/chocos/Desktop/pagine_azzurre/backend/routers/userRouter.js`

**Line Numbers:** 
- orderRouter.js: 163, 184, 187
- userRouter.js: 180, 417, 440, 478, 551

**Code Snippets:**

```javascript
// orderRouter.js:163 - Order mailing
sgMail.send(recipient)
  .then((res) => {
    console.log("Mailing Order RES_CODE: ", res[0].statusCode)
  })
  .catch((error) => { console.error(error)})

// orderRouter.js:184 - Order notifications
sgMail.send(recipientOfferer)
  .then(() => {
    sgMail.send(recipientBuyer)
      .then(() => { console.log("Notification sent to buyer") })
      .catch((error) => { console.error(error) })
  })

// userRouter.js:180 - Registration email
sgMail.send(mail)
  .then((res) => {
    console.log("Verification email sent.")
  })
  .catch((error) => {console.error(error)})
```

**User-Controlled Parameters:**
- **Recipient email addresses** (from user registration, order notifications)
- **Email body content** (from `req.body.emailBody` in order mailing - line 161)
- **User names/usernames** embedded in email content

**Request Destination:** 
- External API: SendGrid (https://api.sendgrid.com)
- Controlled by SendGrid API Key in `process.env.SENDGRID_API_KEY`

**Risk Level:** **Medium**

**Validation Present:** 
- **YES** - HTML escaping implemented in `/Users/chocos/Desktop/pagine_azzurre/backend/emailTemplates/mailMsg.js` (lines 1-10):
  ```javascript
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
- All user inputs (emails, usernames, email body) are sanitized before insertion into email templates
- Email addresses used directly as recipients without URL validation

**Exploit Scenarios:**
1. **Email Header Injection:** User provides email with CRLF characters (`\r\n`) to inject additional headers
2. **Spam Relay:** Attacker registers multiple accounts to send spam via SendGrid API
3. **Content Injection:** Malicious HTML/XSS in email body (mitigated by escapeHtml)

**Notes:**
- Not traditional SSRF (destination is fixed - SendGrid)
- Primary risk is abuse of email sending functionality
- No validation that email addresses conform to RFC 5322

---

### 2. Mailtrap Email Service (Next.js API Routes)

**Sink Type:** fetch() - HTTP POST to Mailtrap API  
**File:** `/Users/chocos/Desktop/pagine_azzurre/nextjs/src/lib/services/email.ts`  
**Line Number:** 306

**Code Snippet:**

```typescript
const response = await fetch(MAILTRAP_API_URL, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${MAILTRAP_TOKEN}`,
  },
  body: JSON.stringify({
    from: { email: SENDER_EMAIL, name: SENDER_NAME },
    to: [{ email: to }],
    subject,
    html,
    text,
  }),
});
```

**User-Controlled Parameters:**
- **`to` (email address)** - from function parameters
- **`subject`** - from function parameters
- **`html` and `text` content** - includes user data (usernames, order details)

**Request Destination:** 
- Hardcoded: `https://send.api.mailtrap.io/api/send` (line 11)
- External API: Mailtrap

**Risk Level:** **Medium**

**Validation Present:** 
- **Partial** - Email addresses are validated with regex in some routes:
  ```typescript
  // nextjs/src/app/api/users/newsletter/route.ts:18-24
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return NextResponse.json(
      { message: 'Email non valida' },
      { status: 400 }
    );
  }
  ```
- HTML content is properly escaped in email templates
- No URL validation on destination

**Notes:**
- fetch() URL is hardcoded (not user-controlled)
- Cannot be used for SSRF to arbitrary destinations
- Risk limited to email abuse/spam

---

### 3. AWS S3 File Upload (Backend - Express.js)

**Sink Type:** AWS SDK - S3 PutObject operation  
**File:** `/Users/chocos/Desktop/pagine_azzurre/backend/routers/uploadRouter.js`  
**Line Number:** 33-44

**Code Snippet:**

```javascript
const s3 = new aws.S3()
const storageS3 = multerS3({
  s3,
  bucket: 'pagineazzurre2',  // Hardcoded bucket name
  acl: 'public-read',
  contentType: multerS3.AUTO_CONTENT_TYPE,
  key(req, file, cb){
    cb(null, file.originalname)  // Uses user-provided filename
  }
})
```

**User-Controlled Parameters:**
- **Filename** (`file.originalname`) - directly from user upload
- **File content** - uploaded file data
- **Content-Type** - auto-detected from file

**Request Destination:** 
- AWS S3 service (controlled by AWS SDK configuration)
- **Bucket name hardcoded:** `pagineazzurre2`
- Region/endpoint from AWS SDK defaults

**Risk Level:** **Low**

**Validation Present:** 
- **NO** - No validation on filename, content-type, or file size in backend
- Bucket name is hardcoded (not user-controlled)
- Authentication required (`isAuth` middleware on line 23)

**Exploit Scenarios:**
1. **Path Traversal:** User provides filename like `../../etc/passwd` to write outside intended directory
2. **File Overwrite:** Attacker overwrites existing files by using same filename
3. **Resource Exhaustion:** Upload extremely large files (no size limit)

**Notes:**
- Not traditional SSRF (bucket/destination hardcoded)
- S3 endpoint is internal AWS infrastructure
- Main risks: path traversal in key, file overwrite, resource exhaustion

---

### 4. AWS S3 File Upload (Next.js API Route)

**Sink Type:** AWS SDK v3 - S3Client PutObjectCommand  
**File:** `/Users/chocos/Desktop/pagine_azzurre/nextjs/src/app/api/uploads/s3/route.ts`  
**Line Number:** 69-76

**Code Snippet:**

```typescript
const command = new PutObjectCommand({
  Bucket: BUCKET_NAME,  // env var, default 'pagineazzurre2'
  Key: filename,        // Generated server-side
  Body: buffer,
  ContentType: file.type,
});

await s3Client.send(command);
```

**User-Controlled Parameters:**
- **File content** - uploaded file
- **File type** (validated against allowlist)
- **File extension** (extracted from filename)

**Request Destination:** 
- AWS S3 service
- **Bucket:** From `S3_BUCKET_NAME` env var (default: `pagineazzurre2`)
- **Region:** From `AWS_REGION` env var (default: `eu-west-1`)

**Risk Level:** **Low**

**Validation Present:** 
- **YES** - Comprehensive validation:
  ```typescript
  // File type validation (lines 41-47)
  const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (!validTypes.includes(file.type)) {
    return NextResponse.json(
      { message: 'Tipo file non supportato. Usa JPG, PNG, GIF o WebP.' },
      { status: 400 }
    );
  }
  
  // File size validation (lines 49-56)
  const maxSize = 5 * 1024 * 1024;  // 5MB
  if (file.size > maxSize) {
    return NextResponse.json(
      { message: 'File troppo grande. Massimo 5MB.' },
      { status: 400 }
    );
  }
  
  // Filename sanitization (lines 58-60)
  const extension = file.name.split('.').pop() || 'jpg';
  const filename = `${Date.now()}-${Math.random().toString(36).substring(7)}.${extension}`;
  ```
- Authentication required (line 24-28)
- Bucket and region are from environment variables (not user input)

**Notes:**
- Well-implemented upload with proper validation
- Filename is generated server-side (prevents path traversal)
- Not SSRF (destination hardcoded via env vars)
- No risk of arbitrary bucket/region manipulation

---

### 5. Blockchain RPC Provider (Backend - Express.js)

**Sink Type:** Web3/HDWalletProvider - Infura RPC endpoint connection  
**File:** `/Users/chocos/Desktop/pagine_azzurre/backend/routers/paymentRouter.js`  
**Line Number:** 24-26

**Code Snippet:**

```javascript
const InfuraUrl = process.env.INFURA_URL
const provider = new HDWalletProvider([buyerPvKey], InfuraUrl)
const web3 = new Web3(provider)
```

**User-Controlled Parameters:**
- **None directly** - RPC URL comes from environment variable
- Payment amount and recipient are database-derived (not direct user input)

**Request Destination:** 
- Blockchain RPC endpoint (Infura)
- **URL from:** `process.env.INFURA_URL`
- Expected format: `https://goerli.infura.io/v3/[PROJECT_ID]`

**Risk Level:** **Low**

**Validation Present:** 
- **NO** - Environment variable used directly without validation
- If attacker can control environment variables, could redirect to malicious RPC endpoint
- User cannot directly control this parameter through API

**Notes:**
- Not exploitable as SSRF through user input
- Risk only if environment variables are compromised
- Web3 provider connections are outbound HTTPS to blockchain infrastructure

---

## Additional External Request Locations (Non-User-Controlled)

### 6. Ethereal Email Provider (Development Only)

**File:** `/Users/chocos/Desktop/pagine_azzurre/nextjs/src/lib/services/etherealProvider.ts`  
**Destination:** `smtp.ethereal.email:587` (SMTP connection via nodemailer)  
**User Control:** None - only used when `EMAIL_PROVIDER=ethereal`  
**Risk:** None (development/testing only)

---

## Attack Surface Analysis

### Critical Finding: Email-Based Attacks

While no traditional SSRF vulnerabilities exist, the email functionality presents attack vectors:

1. **Email Header Injection**
   - **Location:** All email sending functions
   - **Vector:** CRLF injection in email addresses or names
   - **Impact:** Could inject BCC/CC headers, modify subject, inject additional recipients
   - **Mitigation:** Email library (SendGrid/Nodemailer) should handle this, but explicit validation recommended

2. **Email Relay Abuse**
   - **Location:** Order notifications, registration emails
   - **Vector:** Automated registration of accounts to send spam
   - **Impact:** Reputation damage to SendGrid/Mailtrap account, potential blacklisting
   - **Mitigation:** Rate limiting, CAPTCHA, email verification

3. **Content Injection in Emails**
   - **Status:** **MITIGATED** ✓
   - **Protection:** `escapeHtml()` function sanitizes all user inputs
   - **Coverage:** All email templates in backend and Next.js

### Non-SSRF Findings

1. **S3 Bucket ACL Configuration**
   - Backend uses `acl: 'public-read'` which makes all uploads publicly accessible
   - Could lead to information disclosure if sensitive files are uploaded

2. **Seller Link Field**
   - `user.seller.link` can be set via API (userRouter.js:247)
   - Could be used for phishing (malicious link in seller profile)
   - Not SSRF but could be used for open redirect if displayed as clickable link

---

## False Positives / Out of Scope

The following items were investigated but are NOT SSRF sinks:

1. **axios client** (`nextjs/src/lib/api/client.ts`)
   - Client-side only (browser-based)
   - Not server-side requests
   - Out of scope

2. **Google Maps API** (frontend)
   - Client-side API calls
   - Not network-accessible server code
   - Out of scope

3. **Web3 RPC calls in userRouter.js**
   - Code commented out (lines 22-28)
   - `SendCombo()` function not used (line 554 commented out)
   - Not active SSRF sink

---

## Recommendations

### High Priority

1. **Implement Email Address Validation**
   ```javascript
   // Validate RFC 5322 compliance and prevent header injection
   function isValidEmail(email) {
     const rfc5322Regex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
     return rfc5322Regex.test(email) && !email.includes('\r') && !email.includes('\n');
   }
   ```

2. **Add Rate Limiting on Email Endpoints**
   - Limit registration emails per IP address
   - Limit order notification emails per user
   - Implement CAPTCHA for registration

3. **Validate File Extensions in Backend S3 Upload**
   - Backend uploadRouter.js has no file type validation
   - Add allowlist similar to Next.js implementation

### Medium Priority

4. **Review S3 Bucket Policies**
   - Evaluate if `public-read` ACL is necessary
   - Consider signed URLs for temporary access instead

5. **Sanitize Seller Link Field**
   - Validate URL format if seller.link is displayed
   - Implement URL allowlist or content security policy

6. **Add Infura URL Validation**
   - Validate environment variable format on startup
   - Ensure it matches expected Infura URL pattern

### Low Priority

7. **Implement Webhook Signature Verification**
   - If webhooks are added in future, verify sender authenticity

8. **Add Content-Type Validation for S3**
   - Verify uploaded content matches declared MIME type

---

## Conclusion

**No traditional SSRF vulnerabilities found.** All server-side HTTP requests are to hardcoded, trusted destinations:
- SendGrid API (email)
- Mailtrap API (email)
- AWS S3 (file storage)
- Infura (blockchain RPC)

The primary security concerns are:
1. **Email abuse/spam relay** (medium risk)
2. **Email header injection** (low risk with current escaping)
3. **S3 filename path traversal in backend** (low risk, requires auth)

All identified sinks are **intentional integrations** with external services and do not allow user-controlled destination URLs.
