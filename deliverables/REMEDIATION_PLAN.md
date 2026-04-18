# Remediation Plan — pagine_azzurre

**Source of truth:** `deliverables/comprehensive_security_assessment_report.md` + supporting deliverables in the same directory. Every task below cites the section of the report that contains the exploit evidence, payload, and root-cause analysis — open those sections before touching code.

**Target for this plan:** a Claude Code agent (or human) working on the `nextjs/` Next.js 16 app. All paths are relative to `nextjs/` unless noted.

**Working mode:**
- Each task is self-contained: one vulnerability, one fix, one verification step.
- Fix tasks in the order listed — P0 before P1 before P2. Authorization middleware (Task 4) is a prerequisite for several P1 fixes; do not skip ahead.
- Run `npm run build` + `npm run test` after each task. Commit per task with the `VULN-ID` in the subject line so rollback is trivial.
- Do **not** touch `nextjs/.env.local` or `nextjs/.env.local.bak` — those are pentest scaffolding, handled separately (see §Cleanup).

---

## P0 — Critical (fix within 48 hours)

### Task 1 — INJ-VULN-02: NoSQL injection in email verification → account takeover + blockchain theft
- **File:** `src/app/api/users/verification/[id]/route.ts` (around line 28 per report §INJ-VULN-02)
- **Evidence:** Report lines 79–275. Payload `{"uuid": {"$ne": null}}` returns a valid one-shot `loginToken` for an arbitrary unverified user, then triggers `100 VLZ` + `0.01 ETH` to the attacker.
- **Root cause:** The request body's `uuid` is passed directly into a Mongo query without type validation, so a MongoDB operator object (`$ne`, `$gt`, `$regex`, ...) matches the first unverified row instead of an exact UUID string.
- **Fix:**
  1. Validate `uuid` with `zod` (or an explicit `typeof body.uuid === 'string'` guard that also checks it matches the expected UUID regex). Reject non-string early.
  2. Keep the route handler constant-time on mismatch — do not short-circuit on "found vs not found" to avoid introducing a new enumeration oracle.
  3. Audit the sibling file `src/app/api/users/password-replacement/route.ts` and apply the same string-type guard to every field used in the `findOne`/`updateOne` filter — INJ-VULN-01 lives there and is currently mitigated only by a post-query comparison, which is fragile.
- **Verification:**
  - Reproduce the exploit from report §INJ-VULN-02 ("Proof-of-concept exploit") — it must now return `400` or `404`, not `200` + `loginToken`.
  - Happy-path registration + email verification must still work end-to-end (create a fresh test user, click the email link).
- **Effort:** 2–3 h. **Risk:** low (scoped to two route handlers).

### Task 2 — AUTHZ-VULN-02: Public unauthenticated user profile endpoint
- **File:** `src/app/api/users/[id]/route.ts` (lines 13–43 per report §AUTHZ-VULN-02)
- **Evidence:** Report lines 1037–1149. `GET /api/users/:id` has **zero** auth checks and returns 19 sensitive fields for any ObjectId. Mass-harvestable.
- **Fix:**
  1. Require a valid NextAuth session.
  2. Return the full profile only when `session.user.id === params.id` or `session.user.isAdmin === true`.
  3. For other authenticated callers, return a minimal public projection: `{ username, seller: { name, rating, numReviews } }` at most. Everything else (email, phone, `cf`, `partitaIva`, `birthday`, `birthplace`, `city`, `zipCode`, `referer`, `accountKey`, wallet address) is PII and must be stripped server-side.
  4. Do **not** rely on `toJSON()` in the model — it runs too late and the report shows it only strips 4 fields. Do the projection in the route handler with an explicit allowlist.
- **Verification:**
  - `curl http://localhost:3000/api/users/<any-id>` without a cookie → `401`.
  - Same request with a non-owner session → minimal profile only; no `email`, `phone`, `cf`, `partitaIva`, etc.
  - Same request with an owner session or an admin session → full profile.
- **Effort:** 3–4 h.

### Task 3 — AUTHZ-VULN-01: IDOR on orders detail
- **File:** `src/app/api/orders/[id]/route.ts` (lines 12–41 per report §AUTHZ-VULN-01)
- **Evidence:** Report lines 939–1036. Any authenticated user reads any order — shipping addresses, phone, totals, payment info.
- **Fix:**
  1. After loading the order, enforce: `order.user.toString() === session.user.id || order.seller.toString() === session.user.id || session.user.isAdmin`.
  2. On mismatch, return `404` (not `403`) to avoid confirming that the ID exists.
- **Verification:** Report §AUTHZ-VULN-01 "Proof-of-concept" must return `404` as non-owner; owner and admin must still succeed.
- **Effort:** 1–2 h.

### Task 4 — Centralized authorization helper (prerequisite for Task 5 and for future endpoints)
- **New file:** `src/lib/auth/require.ts`
- **Why:** Tasks 2, 3, 5, and the productRouter/orderRouter issues listed in `pre_recon_deliverable.md` §7.2 all repeat the same "load session → compare owner ID → project fields" dance. Write it once.
- **Fix:** Export:
  - `requireSession(req): Promise<Session>` — throws 401 as a typed error if no session.
  - `requireOwnerOrAdmin(session, ownerId)` — throws 404 on mismatch (not 403, for the reason in Task 3).
  - `projectPublicUser(user)` and `projectOwnerUser(user)` helpers used by Task 2.
- **Verification:** Unit tests in `src/lib/auth/require.test.ts` covering: no session → 401, owner → pass, non-owner → 404, admin → pass.
- **Effort:** 2 h.

### Task 5 — AUTHZ-VULN-03 + product IDOR: sellers reading and mutating other sellers' data
- **Files:**
  - `src/app/api/orders/route.ts` (lines 30–34 per report §AUTHZ-VULN-03)
  - `src/app/api/products/[id]/route.ts` — `PUT` and `DELETE` handlers (per pre-recon §7.2)
- **Evidence:** Report §AUTHZ-VULN-03 lines 1150–1261 for the seller-query manipulation. Pre-recon deliverable for the product mutation endpoints.
- **Fix (orders list):** Use `requireSession` from Task 4, then:
  - If `session.user.isAdmin` → honor the `seller` query param if present.
  - Else if `session.user.isSeller` → **force** the filter to `seller: session.user.id`, regardless of what the caller sent.
  - Else → reject (`403`).
- **Fix (product PUT/DELETE):** Load the product, enforce `product.seller === session.user.id || isAdmin`, else `404`.
- **Verification:** Seller A cannot list/edit/delete Seller B's products; both proofs-of-concept in the report must fail.
- **Effort:** 3 h.

### Task 6 — XSS-VULN-01 + XSS-VULN-02: JSON-LD script-context breakout on product page
- **File:** `src/app/product/[id]/page.tsx` — Product JSON-LD around line 169, Breadcrumb JSON-LD around line 174 (per report §XSS-VULN-01/02)
- **Evidence:** Report lines 283–533. Shannon created a live product with payload `</script><script>alert(1)</script><script>` in both the name and description fields; the browser executed it ("Payload in HTML: true").
- **Root cause:** `dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }}` — `JSON.stringify` escapes quotes but **does not** escape the `</script>` sequence, so the string terminates the enclosing `<script>` tag.
- **Fix (recommended):** Replace the JSON.stringify output with an escaped version that neutralizes `<` inside the JSON-LD payload. Two acceptable approaches:
  1. `JSON.stringify(schema).replace(/</g, '\\u003c')` — minimal change, well-known mitigation. Apply to **both** the product and breadcrumb JSON-LD blocks.
  2. Use a library helper such as `serialize-javascript` with `{ isJSON: true }` which handles this and a few other edge cases (`</`, `\u2028`, `\u2029`).
- **Also:** Add a Content Security Policy via `next.config.ts` headers: at minimum `default-src 'self'; script-src 'self'` so that even if a future injection slips through, inline scripts do not execute. The report notes "No CSP" as a contributing factor.
- **Verification:** Create a product named `</script><script>window.__xss=1</script>` and a matching description. Load `/product/<id>` in a real browser. `window.__xss` must be `undefined`. The JSON-LD block must still validate (`JSON.parse(block.textContent)` should succeed).
- **Effort:** 2 h for the escape + 2 h for the CSP rollout (expect to iterate once to unbreak any legitimate inline script).

### Task 7 — Plaintext blockchain private keys (`User.accountKey`)
- **File:** `src/lib/db/models/User.ts` + every read/write site of `accountKey`
- **Evidence:** Pre-recon deliverable §1.1 and §7.1. This is a P0 independent of any single exploit — a database snapshot equals total financial loss for every user.
- **Fix (staged — do 7a immediately, 7b within the week):**
  - **7a (immediate, 1–2 days):** Introduce a `KEK` (Key Encryption Key) loaded from env (`ACCOUNT_KEY_KEK`, 32 bytes, base64). Add `src/lib/crypto/accountKey.ts` with `encrypt(plaintext)` and `decrypt(ciphertext)` using `crypto.createCipheriv('aes-256-gcm', ...)` with a random IV per record. Store as `{ iv, ciphertext, tag }` serialized. Write a one-shot migration script `scripts/migrate-accountKey-encryption.ts` that encrypts every existing row. Rotate the old plaintext `accountKey` column out once the migration is verified. **The KEK must not live in `.env.local`** — use AWS KMS / Vault / 1Password / `security` keychain — but for a minimum-viable fix it can come from an `ACCOUNT_KEY_KEK` env var that is not checked into git and is set in production via the hosting provider's secret manager.
  - **7b (within 1 week):** Plan migration to a non-custodial model (WalletConnect / MetaMask / WAGMI). Filed as a separate tracking ticket — do not block 7a on it.
- **Verification:**
  - Post-migration, `db.users.findOne({}, { accountKey: 1 })` must return a ciphertext object, not a 64-char hex string.
  - Existing flows that sign transactions with the user's key must still work end-to-end (identify these via `grep -rn "accountKey" src/`).
  - **Rotate the keys** for any user whose plaintext key was ever committed in a backup — the DB dump is already compromised if anyone pulled it.
- **Effort:** 2 days for 7a, not counting 7b.

---

## P1 — High (fix within 1 week)

### Task 8 — AUTH-VULN-01: No rate limiting on password recovery (email bombing)
- **Scope:** Apply a rate limiter to the entire `/api/users/*` auth surface, not just one endpoint. The report shows this gap is system-wide: password recovery, signin (AUTH-VULN-06, brute force), registration (AUTH-VULN-05).
- **Fix:**
  1. Add `@upstash/ratelimit` with a Redis/Upstash backing store (or a Mongo-backed limiter if you do not want another service). Middleware at `src/proxy.ts` or in a `withRateLimit()` wrapper.
  2. Limits to enforce:
     - `POST /api/users/password-recovery` → 5/hour per IP **and** 3/hour per email.
     - `POST /api/users/signin` → 10/minute per IP, 5 failures in 15 min per email → temporary lockout (see Task 10).
     - `POST /api/users/register` → 5/hour per IP.
  3. Return `429` with `Retry-After` header on limit hit.
- **Verification:** `for i in 1..50; do curl -X POST .../password-recovery -d '{"email":"x@y.z"}'; done` — the first ~5 return `200`, the rest `429`. Report §AUTH-VULN-01 proof-of-concept must fail.
- **Effort:** 1 day.

### Task 9 — AUTH-VULN-02/03/05/11: User enumeration (status codes + timing)
- **Evidence:** Report §AUTH-VULN-02/03/05/11 (lines 575–925).
- **Fix:**
  - **Password recovery, signin, register:** always return the same generic success message and the same HTTP status (`200 OK` with a neutral body) regardless of whether the email exists. Do the real work asynchronously.
  - **Timing:** before returning, run a dummy bcrypt compare against a fixed precomputed hash even when the user does not exist, so the response time for a valid and an invalid email is statistically indistinguishable. This closes AUTH-VULN-03 and AUTH-VULN-11 simultaneously.
- **Verification:** The `curl -w '%{time_total}'` scripts from report §AUTH-VULN-03 must show overlapping distributions for valid vs invalid emails (difference < 50 ms at p95).
- **Effort:** 4–6 h.

### Task 10 — AUTH-VULN-06: Unlimited bruteforce on signin
- **Fix:** Tied to Task 8's rate limiter: after 5 failed `POST /api/users/signin` for the same email within 15 minutes, return `429` for that email regardless of password correctness, for the next 15 minutes. Reset the counter on a successful login. Log the lockout event.
- **Verification:** Report §AUTH-VULN-06 proof-of-concept (attempts 1–20 against one email) must stop returning `401` after the 5th attempt and return `429` instead.
- **Effort:** 2–3 h (on top of Task 8).

### Task 11 — Multi-tenant isolation review (beyond the specific endpoints above)
- **Evidence:** Pre-recon deliverable §6 lists multiple `HIGH` severity findings in order/product/seller isolation beyond the ones exploited. These are not in the final report because Shannon did not run active exploits against them, but the static analysis is solid.
- **Fix:** Use Task 4's helper to audit every route under `src/app/api/orders/**`, `src/app/api/products/**`, `src/app/api/users/**`. For each handler, answer: "does it load data scoped to `session.user.id`?" If not, either add the scoping or document why the endpoint is intentionally cross-tenant.
- **Deliverable:** An audit table saved to `docs/authz-audit.md` listing every route, its scope, and its fix status. This doubles as future-proof documentation.
- **Effort:** 1–2 days.

### Task 12 — GDPR gaps (minimum viable compliance)
- **Evidence:** Pre-recon deliverable §5. Legal exposure is up to €20M / 4% of revenue.
- **Fix (minimum viable):**
  1. **Self-service deletion** (Art. 17): add `DELETE /api/users/me`. Soft-delete with a 30-day grace period; after 30 days, a cron job hard-deletes + anonymizes the user's orders.
  2. **Data export** (Art. 20): add `GET /api/users/me/export` returning a JSON blob of the user's data.
  3. **Consent tracking** (Art. 7): add a `consent` subdocument to `User` with `marketing`, `analytics`, `termsAcceptedAt`, `privacyPolicyAcceptedAt`. Block registration until terms + privacy are ticked.
  4. **Data minimization:** remove `birthday`, `birthplace`, lat/lng from the registration form unless there is a documented business need. If needed, make optional.
  5. **Unsubscribe link** in every Mailtrap-sent email.
- **Effort:** 2–3 days. **Note:** this is legal-facing. Loop in whoever handles privacy policy copy.

---

## P2 — Medium (fix within 1 month)

### Task 13 — Weak bcrypt cost factor
- **File:** `src/lib/db/models/User.ts` and every call site that hashes a password (registration, password change, password reset).
- **Current:** `bcrypt.hashSync(password, 8)`
- **Fix:** bump to 12. On successful login, if `user.password` starts with `$2a$08$` or `$2a$10$`, rehash at 12 and update the row (transparent upgrade — users do not need to reset anything).
- **Verification:** New registrations produce hashes starting with `$2a$12$`. Existing users are transparently upgraded on next login.
- **Effort:** 1 h.

### Task 14 — Missing security headers
- **File:** `next.config.ts`
- **Fix:** Add `async headers()` returning:
  - `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
  - `Content-Security-Policy: default-src 'self'; script-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'` (refine after Task 6)
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy: geolocation=(), camera=(), microphone=()`
- **Verification:** `curl -I https://<prod-url>/ | grep -iE 'strict-transport|content-security|x-content-type'`
- **Effort:** 2 h (half is iterating on CSP).

### Task 15 — Data-at-rest encryption for PII (beyond accountKey)
- **Evidence:** Pre-recon deliverable §2.2.
- **Fix:** Enable MongoDB Client-Side Field Level Encryption (CSFLE) for `email`, `phone`, `cf`, `partitaIva`, `zipCode`, `city`, `birthday`, `birthplace` — or at minimum for `cf` and `partitaIva` which are the highest-sensitivity Italian tax identifiers. CSFLE requires a Key Vault collection and a per-field encryption schema. **Do not block on this if it slows down Task 7** — that one is a bigger financial risk.
- **Effort:** 2–3 days (CSFLE setup is non-trivial).

---

## Cleanup (unrelated to the app code, but part of closing this pentest)

- [ ] Delete `nextjs/.env.local.bak` — backup left behind during the pentest, contains the **original** plaintext Atlas, Mailtrap, S3, and Vercel OIDC secrets.
- [ ] Rotate those credentials regardless of who has seen them: Atlas password, Mailtrap API token, S3 IAM access key, Vercel OIDC token, `ADMIN_PRIVATE_KEY` wallet. Assume compromised.
- [ ] Move `frontend/.env` out of git tracking: `git rm --cached frontend/.env`, add to `.gitignore`. The file only contained `SKIP_PREFLIGHT_CHECK=true` and `PORT=2998`, so no rotation needed, but it should not be tracked.
- [ ] When ready to stop pentesting, restore `nextjs/.env.local` from `.env.local.bak` if you need Atlas back, or keep pointing to `mongodb://127.0.0.1:27017/pagine_azzurre_pentest` for further dev.
- [ ] Optional: `./shannon.mjs --cleanup fa23cabd-ab85-4cd2-994d-6490300cd080` from the Shannon repo to drop the audit logs for this session.

---

## Suggested commit/branch strategy

1. Branch: `security/pentest-shannon-2026-04-14`.
2. One commit per task. Subject line: `fix(security): <TASK-ID> — <short>`. Example: `fix(security): INJ-VULN-02 — validate uuid type in verification route`.
3. Open the PR as a draft after Task 6 (all P0 critical fixes landed), mark ready for review once P1 tasks 8–11 are in.
4. Do not squash — each task needs an independent rollback point.

## Estimated total effort

| Tier | Tasks | Effort |
|---|---|---|
| P0 | 1–7 | ~6 working days (1 dev), parallelizable down to 3 |
| P1 | 8–12 | ~6 working days |
| P2 | 13–15 | ~4 working days |
| **Total** | 15 tasks | **~16 working days** for one dev, ~8 with two |

Start with Tasks 1, 2, 3, 6, 7a in parallel if you have the capacity — they are the findings an attacker would chain together for maximum damage (account takeover + PII harvest + private key theft).
