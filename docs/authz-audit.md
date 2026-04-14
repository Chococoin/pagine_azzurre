# Multi-Tenant Authorization Audit — `nextjs/`

**Date:** 2026-04-14
**Scope:** every `route.ts` under `src/app/api/orders/**`, `src/app/api/products/**`, `src/app/api/users/**` (28 files, 37 handlers).
**Context:** produced as Task 11 of the Shannon pentest remediation plan (`deliverables/REMEDIATION_PLAN.md`). Ran after the branch `security/pentest-shannon-fixes` landed Tasks 1–10 and Task 13.

**Reading the `Risk` column:**
- **FIXED** — vulnerability was in the original pentest report and is closed on this branch. Listed for traceability.
- **CRITICAL** — confirmed unauthorized write or PII exposure across tenants, exploitable with valid session.
- **HIGH** — unauthorized cross-tenant read or trust violation, exploitable with valid session.
- **MEDIUM** — weak validation, predictable identifier, or missing rate limit on a sensitive action.
- **LOW** — intentionally public or correctly gated, nothing to do.

---

## Table

| File | Method | Auth | Owner-scope | Writes | Risk | Note |
|------|--------|------|-------------|--------|------|------|
| orders/route.ts | GET | seller-or-admin | session.user.id (forced for non-admin) | N | FIXED | AUTHZ-VULN-03 closed in `7c4014b` |
| orders/route.ts | POST | session-required | session.user.id (as buyer) | Y | LOW | `user` field hard-coded from session |
| orders/[id]/route.ts | GET | session-required | buyer/seller/admin only | N | FIXED | AUTHZ-VULN-01 closed in `7f2e039` |
| orders/[id]/route.ts | DELETE | admin-only | N/A | Y | LOW | Admin-only deletion |
| orders/[id]/deliver/route.ts | PUT | session-required | buyer only | Y | LOW | Buyer-only escrow release on delivery |
| orders/[id]/pay/route.ts | PUT | session-required | buyer only | Y | LOW | Buyer-only wallet transfer, uses `decryptAccountKey` |
| orders/mine/route.ts | GET | session-required | session.user.id | N | LOW | Only returns caller's own orders |
| **orders/mailing/route.ts** | **POST** | session-required | **cross-tenant** | Y | **HIGH** | **New finding — see §New issues #1** |
| **orders/notifications/route.ts** | **POST** | session-required | **cross-tenant** | N | **HIGH** | **New finding — see §New issues #2** |
| products/route.ts | GET | public-by-design | N/A | N | LOW | Public search. Note: accepts Mongo filter params — see §Medium findings #M1 |
| products/route.ts | POST | seller-or-admin | session.user.id (as seller) | Y | LOW | Seller hard-coded from session |
| products/[id]/route.ts | GET | public-by-design | N/A | N | LOW | Public read |
| products/[id]/route.ts | PUT | seller-or-admin | session.user.id | Y | FIXED | 404 on mismatch (`7c4014b`) |
| products/[id]/route.ts | DELETE | seller-or-admin | session.user.id | Y | FIXED | 404 on mismatch (`7c4014b`) |
| products/[id]/reviews/route.ts | GET | public-by-design | N/A | N | LOW | Public reviews read |
| products/[id]/reviews/route.ts | POST | session-required | partial | Y | MEDIUM | Dedupes by `name` not `session.user.id` — see §Medium findings #M2 |
| products/categories/route.ts | GET | public-by-design | N/A | N | LOW | Distinct categories list |
| users/route.ts | GET | admin-only | N/A | N | LOW | `toJSON()` leaves PII in — acceptable because admin-only |
| users/route.ts | POST | public-by-design | N/A | Y | LOW | Rate-limited register (Task 8), enum-closed (Task 9) |
| users/[id]/route.ts | GET | session-required | owner/admin only | N | FIXED | AUTHZ-VULN-02 closed in `560af04`; projections applied |
| users/[id]/route.ts | PUT | admin-only | N/A | Y | LOW | Admin user update |
| users/[id]/route.ts | DELETE | admin-only | N/A | Y | LOW | Admin delete |
| users/newsletter/route.ts | PATCH | public-by-design | N/A | Y | LOW | Email-based toggle; no session |
| users/newsletter/[email]/route.ts | GET | public-by-design | N/A | N | LOW | Public subscription status |
| users/newsletter-update/route.ts | POST | public-by-design | N/A | Y | LOW | Email-based update |
| users/newsletter-verify/route.ts | POST | public-by-design | N/A | Y | MEDIUM | Sets `verified=true` on any email without a token — see §Medium findings #M3 |
| users/password-recovery/route.ts | POST | public-by-design | N/A | N | FIXED | Rate limit + random id + constant response (`34b5283` + `5d08c15`) |
| users/password-replacement/route.ts | POST | public-by-design | N/A | Y | FIXED | Rate limit + type checks (`a79bf6c` + `34b5283`) |
| users/private-key/route.ts | GET | session-required | session.user.email | N | LOW | Uses `decryptAccountKey`. Email-vs-id scoping quirk — see §Medium findings #M4 |
| users/profile/route.ts | GET | session-required | session.user.id | N | LOW | Caller's own profile |
| users/profile/route.ts | PUT | session-required | session.user.id | Y | LOW | Caller's own profile |
| users/referers/route.ts | GET | public-by-design | N/A | N | LOW | Distinct grouping list |
| users/register/route.ts | POST | public-by-design | N/A | Y | FIXED | Rate limit + enum defense + hashPassword (`34b5283` + `5d08c15` + `abe9d3c`) |
| users/sellers/route.ts | GET | public-by-design | N/A | N | LOW | Public seller directory |
| users/signin/route.ts | POST | public-by-design | N/A | N | FIXED | Rate limit + per-email lockout + timing close + rehash (Tasks 8/9/10/13) |
| users/top-sellers/route.ts | GET | public-by-design | N/A | N | LOW | Public top-3 |
| users/upgrade/[id]/route.ts | PUT | session-required | session.user.id | Y | LOW | **`[id]` URL param is ignored**, handler always upgrades caller — safe but confusing, rename route |
| users/verification/[id]/route.ts | POST | public-by-design | N/A | Y | FIXED | INJ-VULN-02 closed in `a79bf6c` |

**Summary:**
- 37 handlers audited
- 12 **FIXED** in this branch (matches Tasks 1–10 + 13)
- 2 **HIGH** new issues (§New issues below)
- 4 **MEDIUM** new issues (§Medium findings below)
- Remaining **LOW** are public-by-design or admin-only-by-design

---

## §New issues (not in the original Shannon report)

### New #1 — HIGH — `POST /api/orders/mailing` allows phishing any seller

**File:** `src/app/api/orders/mailing/route.ts` lines 18–68
**Auth:** session required
**Bug:** the caller posts `{ order: { _id, seller }, buyer: { name }, emailBody }`. The handler fetches the seller by ObjectId, verifies the order exists, and then sends an email to the seller with a caller-controlled `emailBody` and `buyer.name`. There is **no check that the caller is the buyer or seller of that order**, so any authenticated user can trigger an email to any seller with arbitrary content.

**Impact:** phishing / social engineering attacks from `noreply@pagineazzurre.net` (a trusted domain), brand damage, potential email-deliverability reputation loss. Combined with Task 8's rate limit bypass on endpoints where that was not yet applied (this one).

**Fix:**
1. Load the order from the DB by its real `_id` (do not trust `order.seller` from the body — use `order.seller` as stored on the fetched `Order` document).
2. Require `session.user.id === order.user.toString()` OR `session.user.id === order.seller.toString()` OR `session.user.isAdmin`.
3. Add rate limit: `mailing-ip` 20/hour and `mailing-email` 5/hour (key on seller email).
4. Sanitize `emailBody` (length cap + HTML strip) before passing to the mailer.

### New #2 — HIGH — `POST /api/orders/notifications` forges order notifications

**File:** `src/app/api/orders/notifications/route.ts` lines 20–77
**Auth:** session required
**Bug:** the caller posts `{ seller, orderItems, totalPriceVal, shippingAddress }`. The handler fetches the seller by id and immediately sends two emails (one to the seller, one to the buyer/caller) that read like real order notifications, embedding caller-controlled `orderItems` and `shippingAddress` strings. No reference to a real `Order` in the DB; no check that an order between the caller and this seller exists.

**Impact:** authenticated user can forge "you have a new order" emails to any seller with any item/price/address, using the platform's mail infrastructure as a trust-laundering front.

**Fix:** drop this endpoint. `POST /api/orders` already sends buyer+seller notifications inline on order creation (see `orders/route.ts:112-165`). Fire-and-forget duplicate with no ownership model = unnecessary attack surface.

---

## §Medium findings

### M1 — `GET /api/products` uses query params directly in Mongo filters

**File:** `src/app/api/products/route.ts`
**Bug:** `name`, `category`, `seller`, `city`, `organization` come from `request.nextUrl.searchParams.get(...)`. They are strings (URLSearchParams type-safe) so they cannot be NoSQL operators, but `name` is spliced into `$regex: name` without escaping regex metacharacters — ReDoS vector (pathological regex crafted by attacker causes multi-second CPU spin per request).

**Fix:** escape `name` before passing to `$regex`: `name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')`, or better, use Atlas Search / a `$text` index.

### M2 — Review dedup keys on display name instead of user id

**File:** `src/app/api/products/[id]/reviews/route.ts`
**Bug:** dedupe check is `product.reviews.find(r => r.name === session.user.name)`. Two users with the same display name lock each other out of reviewing. Also means a user can review the same product from two different accounts to pile-up fake reviews if usernames differ.

**Fix:** dedupe on `r.user?.toString() === session.user.id`, and store `user: session.user.id` on every review.

### M3 — `POST /api/users/newsletter-verify` accepts any email without a token

**File:** `src/app/api/users/newsletter-verify/route.ts`
**Bug:** endpoint sets `verified: true` on the `Newsletter` doc keyed by the email in the request body. No verification token. An attacker (or a bot) can mass-verify arbitrary email subscriptions.

**Fix:** require a nonce token sent via the welcome email, stored alongside the newsletter row, and match it before flipping `verified`. Or, at minimum, rate-limit this endpoint the way `password-recovery` was rate-limited in Task 8.

### M4 — `/api/users/private-key` scopes by email instead of session.user.id

**File:** `src/app/api/users/private-key/route.ts:22-24`
**Bug:** `UserModel.findOne({ email: session.user.email }, { accountKey: 1 })`. Technically safe today because NextAuth sessions carry the owner's email, but email is mutable (admin update route can change it) and a stale-but-still-valid token after an email rotation could read a different user's wallet.

**Fix:** change the lookup to `UserModel.findById(session.user.id, { accountKey: 1 })`. One-line change.

---

## §What was NOT audited here

- `src/app/api/auth/[...nextauth]` — NextAuth provider wiring, out of multi-tenant scope.
- `src/app/api/config/*` — read-only config endpoints (Google, PayPal, Web3); no tenant data.
- `src/app/api/uploads/*`, `src/app/api/payment/prepare` — separate review; file-upload and payment-prep endpoints have their own threat model.
- Client-side code under `src/app/**/page.tsx` — authorization decisions enforced server-side only; client is untrusted.
- `src/proxy.ts` — does not exist. `src/middleware.ts` exists and catches unauthenticated API calls with a 307 redirect to `/api/auth/signin`, which is defense-in-depth; handler-level auth still runs on top.

---

## §How to read this audit when fixing new issues

Before opening a PR that touches any of the 37 routes above:

1. Re-read this file and confirm the route's entry is still accurate.
2. If the route moves from public-by-design to session-required, update the table (`Auth` and `Owner-scope` columns) and move the risk row accordingly.
3. If a new route is added, append a row following the same format.
4. For ownership checks, prefer the centralized helpers in `src/lib/auth/require.ts` (`requireSession`, `requireOwnerOrAdmin`, `projectPublicUser`, `projectOwnerUser`) over hand-rolled `getServerSession` checks — one audit row, one behavior.
5. For rate limits, import from `src/lib/security/rateLimit.ts` and add a new bucket constant; the TTL index on `rate_limits` takes care of cleanup.

The audit is a living artifact. It is cheaper to keep it honest than to re-discover the same IDOR twice.
