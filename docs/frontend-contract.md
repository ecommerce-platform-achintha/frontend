# Marketplace frontend: backend contract (source of truth)

Derived from the backend repos (gateway config, controllers, DTOs, enums, error codes). If this file and an assumption disagree, this file wins. If this file and the backend disagree, stop and report the difference; do not guess.

Items marked (inferred) come from design docs or method descriptions, not from reading service logic.

## 1. System facts

- One entry point: the API gateway. Base URL from `VITE_API_BASE_URL` (default `http://localhost:8080`). Never call a service port directly.
- CORS is answered by the gateway only. Allowed origins by default: `http://localhost:3000` and `http://localhost:5173`. Allowed request headers: `Authorization`, `Content-Type`, `Idempotency-Key`. Exposed response headers: `Retry-After`, `X-RateLimit-Remaining`. Therefore the dev server MUST run on port 5173 with `strictPort: true`. Do not send cookies (`withCredentials: false`); auth is a Bearer token.
- Request body limit 1 MB. Gateway time limit per call is 3 s; on timeout or downstream failure the gateway answers 503 `SERVICE_UNAVAILABLE`.
- Rate limits (per IP or per user, in-memory buckets): login/refresh/register 10 per minute per IP; checkout and payment submission 20 per minute per user; public GETs 300 per minute; everything else 120 per minute. Over the limit: 429 `RATE_LIMITED` with `Retry-After` (seconds).
- `/internal/**` does not exist for the browser (404).

## 2. Conventions

- **Paging**: `page` (0-based), `size` (default 20), `sort`. Response: `{ content, page, size, totalElements, totalPages }`. A `size` above the maximum is silently capped (50 for user-facing lists, 100 for admin lists); read the returned `size`.
- **Sort**: `field,asc` or `field,desc`. An unknown field gives 400 `INVALID_SORT`. Allowed fields are listed per endpoint below. Public product search uses its own values (section 7.3).
- **Un-paged lists (plain arrays)**: `GET /api/public/categories`, `GET /api/admin/categories`, `GET /api/merchant/owner/couriers`, `GET /api/merchant/owner/couriers/available`, `GET /api/merchant/owner/bank-accounts/banks`, `GET /api/super-admin/settings`, `GET /api/customer/orders/{id}/bank-accounts`.
- **Array query params**: order and complaint lists take `status` as a list. Axios must serialise it as `status=A&status=B` (`paramsSerializer: { indexes: null }`), not `status[]=A`.
- **Errors**: `{ timestamp, status, error, code, message, path, fieldErrors: [{ field, message }] }`. Empty fields are omitted. Always branch on `code`, show `message`, and map `fieldErrors` to inline form errors. Gateway errors have the same shape without `fieldErrors`.
- **IDs**: UUIDs are never exposed. Public IDs look like `ORD-2610-7K2M9Q` (regex `^[A-Z]{3}-\d{4}-[0-9A-HJKMNP-TV-Z]{6}$`). Prefixes: USR user, STR store, ITM product, VAR variant, ORD order, CHK checkout group, PAY payment, CMP complaint, REV review, FLG flagged reference. Cart lines, addresses, bank accounts, shipping templates, discounts and holidays also use public IDs in this format. Master data uses codes: banks (`BOC`), couriers (`DOMEX`), categories (slug), settings (key like `timers.ship-by-hours`).
- **Money**: JSON numbers, LKR, 2 decimals. Format with `Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR' })`. Never recompute order totals on the client; show the server's numbers.
- **Time**: ISO-8601 UTC strings. Display in `Asia/Colombo`. Holidays use plain dates `yyyy-MM-dd`.
- **Idempotency**: `POST /api/customer/checkout` and `POST /api/customer/orders/{id}/payments` need an `Idempotency-Key` header (UUID). Same key plus same body replays the stored result (24 h). Same key with a different body gives `IDEMPOTENCY_KEY_REUSED`. A missing key gives `IDEMPOTENCY_KEY_REQUIRED`. A concurrent duplicate gives `IDEMPOTENCY_REQUEST_IN_PROGRESS`. Generate one key per user intent, keep it while the user retries the same payload, and create a new key when the payload changes or after success.

## 3. Authentication and session

- `POST /api/auth/login` returns `TokenResponse`: `accessToken, tokenType, expiresIn (seconds), expiresAt, refreshToken, refreshTokenExpiresAt, publicId, role, status, statusReason?, mustChangePassword`.
- Access token: RS256 JWT, TTL 10 minutes. Claims: `sub, pid, role, status, storeId (merchant and assistant only, a UUID), perms (assistant only, string array), tv, iat, exp, jti, iss, aud`. Names and email are NOT in the token: call `GET /api/users/me`. `GET /api/users/me` does NOT return `storeId`: read it from the token.
- Refresh token: opaque, valid 14 days, **single use**. `POST /api/auth/refresh { refreshToken }` returns a new pair. Presenting an already-used refresh token returns 401 `REFRESH_TOKEN_REUSED` and revokes that whole login. Consequences for the client:
    - exactly one refresh in flight at a time (queue the other 401s behind it);
    - across browser tabs, serialise refreshes with `navigator.locks.request('mp-refresh', ...)`; after acquiring the lock, re-read the stored tokens first, because another tab may already have refreshed;
    - persist the new refresh token before releasing the lock.
- Do NOT attach `Authorization` to: `/api/public/**`, `/api/auth/login`, `/api/auth/refresh`, `/api/users/register/**`. Reason: the gateway lets these through, but the services still validate a Bearer token if one is present, so an expired token on a public page would turn into a 401.
- 401 anywhere else: try one refresh (not for `/api/auth/*` URLs), replay the request once, and if refresh fails clear the session and go to `/login` with a message. 401 codes seen: `UNAUTHORIZED`, `TOKEN_REVOKED`, `INVALID_CREDENTIALS`, `INVALID_REFRESH_TOKEN`, `REFRESH_TOKEN_REUSED`.
- `POST /api/auth/logout { refreshToken }` (204). Clear local state even if the call fails.
- `POST /api/auth/change-password { currentPassword, newPassword }` returns a NEW `TokenResponse`; replace the session with it. All other sessions of that user are revoked.
- `mustChangePassword = true` (admins, assistants and the super admin created with temporary passwords): every endpoint except change-password and logout answers 403 `PASSWORD_CHANGE_REQUIRED`. Route the user to a forced change-password page and block everything else.
- Login failures: 401 `INVALID_CREDENTIALS` (same message for wrong email or password), 429 `TOO_MANY_LOGIN_ATTEMPTS` (locked), 403 `ACCOUNT_BANNED` / `ACCOUNT_REMOVED` / `MERCHANT_BANNED` (banned admin, banned or removed assistant, assistant of a banned merchant). Show `message` (it contains the reason).
- Registration returns a profile, not tokens. After a successful registration, send the user to login (or call login with the same credentials).
- Token storage: the backend returns tokens in the JSON body only (no cookie option), so tokens must live in browser storage (`localStorage`, key prefix `mp.`). Mitigate: never use `dangerouslySetInnerHTML`, never log tokens, add a restrictive CSP meta tag for production build notes.

## 4. Roles, statuses, permissions

Roles: `ROLE_CUSTOMER`, `ROLE_MERCHANT` (store owner), `ROLE_ASSISTANT`, `ROLE_ADMIN`, `ROLE_SUPER_ADMIN`. One role per account. The super admin has all admin powers plus the `/api/super-admin/**` endpoints.

Status as seen by the user (`status` in login, token and `/me`): `ACTIVE`, `PENDING_APPROVAL`, `REJECTED`, `BANNED`. A merchant in the silent ban grace period is shown as `ACTIVE`; the UI must never reveal or guess it. Admin screens receive the real status, which can also be `BAN_GRACE`.

| Who and status | UI behaviour |
|---|---|
| Customer `BANNED` | Can sign in, browse and view order history. Hide or disable checkout, quote confirmation and payment submission. Show a banner with `statusReason`. |
| Merchant `PENDING_APPROVAL` | Can set up the store profile, bank accounts, couriers, shipping templates and draft products. Cannot activate products (`MERCHANT_NOT_APPROVED`) or create assistants (`MERCHANT_NOT_ACTIVE`). Show a persistent "awaiting approval" banner. |
| Merchant `REJECTED` | Show `/merchant/application` first: reason, `attemptsUsed/maxAttempts`, and the resubmit form when `canResubmit`. |
| Merchant `BANNED` | History only; hide every mutation; banner with the reason. |
| Assistant | Sees only what its `perms` allow. Never sees owner-only pages. Status and removal are enforced by the backend (login refused). |

Assistant permissions: `ORDER_VIEW, ORDER_QUOTE, PAYMENT_VERIFY, ORDER_SHIP, PRODUCT_EDIT, STOCK_EDIT, DISCOUNT_MANAGE, CUSTOMER_BLOCK, REVIEW_REPLY`. A merchant holds all of them implicitly (`hasPerm` is true for `ROLE_MERCHANT`).

Permission per merchant-side feature:

| Feature | Needs |
|---|---|
| Order list, order detail, complaint list and detail | `ORDER_VIEW` |
| Quote, re-quote, reject order, respond to complaint | `ORDER_QUOTE` |
| Verify or reject a bank transfer | `PAYMENT_VERIFY` |
| Ship, mark delivery failed | `ORDER_SHIP` |
| Product list and detail (read) | any of `PRODUCT_EDIT`, `STOCK_EDIT`, `DISCOUNT_MANAGE` |
| Product create, edit, status change, archive | `PRODUCT_EDIT` |
| Stock edit | `STOCK_EDIT` |
| Discounts | `DISCOUNT_MANAGE` |
| Block and unblock customers | `CUSTOMER_BLOCK` |
| Store review list and reply, product review list and reply | `REVIEW_REPLY` |
| OWNER ONLY (merchant role) | store profile and COD switch, bank accounts, couriers, shipping templates, metrics, assistants, merchant application |

Gateway coarse rules: `/api/customer/**` customers only; `/api/merchant/owner/**` merchant only; `/api/merchant/**` merchant or assistant; `/api/admin/**` admin or super admin; `/api/super-admin/**` super admin only. The UI hides what a user cannot use, but still handles 403 `ACCESS_DENIED`.

## 5. Enums

- `OrderStatus`: `AWAITING_MERCHANT, AWAITING_CUSTOMER_CONFIRMATION, AWAITING_PAYMENT, PAYMENT_SUBMITTED, READY_TO_SHIP, SHIPPED, COMPLETED, CANCELLED_BY_CUSTOMER, REJECTED_BY_MERCHANT, EXPIRED_MERCHANT, DECLINED_BY_CUSTOMER, EXPIRED_CUSTOMER, EXPIRED_PAYMENT, DELIVERY_FAILED, CANCELLED_BY_SYSTEM, CLOSED_BY_ADMIN`. Open = the first six. Everything else is terminal.
- `PaymentMethod`: `BANK_TRANSFER, COD`.
- `DeadlineType`: `MERCHANT_RESPONSE, CUSTOMER_CONFIRMATION, PAYMENT_SUBMISSION, PAYMENT_VERIFICATION, SHIP_BY, AUTO_COMPLETE`.
- `RejectionReason`: `OUT_OF_STOCK, LOW_CUSTOMER_SCORE, COD_HISTORY, CANNOT_DELIVER_TO_AREA, OTHER`.
- `DeliveryFailureType`: `COD_REFUSED, UNDELIVERABLE`.
- `ComplaintType`: `NOT_SHIPPED, WRONG_ITEM, NOT_AS_DESCRIBED, PAYMENT_DISPUTE, OTHER`. `ComplaintStatus`: `OPEN, UNDER_REVIEW, UPHELD, DISMISSED`.
- `FlagStatus`: `OPEN, REVIEWED, ESCALATED`. `ObjectionStatus`: `OPEN, UPHELD, DISMISSED`.
- `ProductStatus`: `DRAFT, ACTIVE, ARCHIVED` (allowed moves: DRAFT to ACTIVE or ARCHIVED, ACTIVE to DRAFT or ARCHIVED, ARCHIVED to DRAFT only). `VariantStatus`: `ACTIVE, INACTIVE`.
- `DiscountScope`: `PRODUCT, VARIANT`. `DiscountType`: `PERCENT` (1 to 90) , `FIXED` (LKR, must leave price above 0).
- `ShippingRuleType`: `FLAT, PER_DISTRICT, WEIGHT_BAND`. `HolidayType`: `PUBLIC, POYA`.
- `AssistantStatus` (admin and owner views): `ACTIVE, BANNED_BY_MERCHANT, BANNED_BY_ADMIN, REMOVED`.
- Stock `mode`: `SET, DELTA`. Order resolve `action`: `FORCE_COMPLETE, CANCEL`. Complaint decision and objection decision: `UPHELD, DISMISSED`. Flag review action: `REVIEWED, ESCALATED`.
- `LineIssue` (cart): `NOT_AVAILABLE, INSUFFICIENT_STOCK, REMOVED`. `SettingValueType`: `INTEGER, DECIMAL, BOOLEAN`. `LedgerEntryType`: `ORDER_FEE, MONTHLY_FEE, CREDIT`.

## 6. Form validation (mirror the backend; the backend is still the authority)

- Email: valid, max 254. Names: required, max 100.
- Phone: `^\+?[1-9]\d{7,14}$` (international format, e.g. `+94771234567`). Strip spaces before sending.
- NIC: `^(\d{9}[VvXx]|\d{12})$`.
- Password: 12 to 128 characters, no leading or trailing whitespace, at least 4 different characters, not a common password. Show a live checklist. No character-class rules.
- Reason fields (ban, reject, hide, resolve, etc.): required where the backend says so, max 500. Longer text: 2000 (reviews, replies, objections) or 4000 (complaints).
- Store name 3 to 100. Codes (bank, courier): `^[A-Z][A-Z0-9_]{1,19}$`. Category slug: `^[a-z0-9]+(-[a-z0-9]+)*$`, max 80. SKU: `^[A-Za-z0-9][A-Za-z0-9._/-]{0,63}$`.
- Bank account number (merchant side): digits only after removing spaces and dashes, 6 to 20. Payment reference: `^\s*[A-Za-z0-9][A-Za-z0-9 /._-]{0,59}\s*$`. Depositor account: digits with optional spaces or dashes.
- Storage keys (images, documents, attachments): `^[A-Za-z0-9][A-Za-z0-9._/-]{0,199}$`. Max 10 images per product or variant, 10 attachments per payment or complaint, 5 per review.
- Address: `recipientName` (max 150), `phone`, `line1` (max 200), optional `line2`, `city`, `district`, `postalCode` (`^[A-Za-z0-9 -]{1,20}$`), optional `country` (defaults to Sri Lanka).
- Money inputs: positive, max 2 decimals.

## 7. Endpoint catalogue (all paths are relative to the gateway)

"Paged" means the response is a page object. "Auth" lists who may call.

### 7.1 Accounts (user-service)

| Method and path | Auth | Notes |
|---|---|---|
| POST `/api/auth/login` | public | `{ email, password }` |
| POST `/api/auth/refresh` | public | `{ refreshToken }` |
| POST `/api/auth/logout` | any user | `{ refreshToken }`, 204 |
| POST `/api/auth/change-password` | any user | returns TokenResponse |
| POST `/api/users/register/customer` | public | `{ email, password, firstName, lastName, nic, phone }`, 201 profile |
| POST `/api/users/register/merchant` | public | same plus `businessName` (max 150) and `documentKeys` (1 to 10 storage keys), 201 profile |
| GET, PUT `/api/users/me` | any user | PUT `{ firstName, lastName, phone? }`. Profile: `publicId, email, firstName, lastName, nic, phone, role, status, statusReason?, mustChangePassword, assistantStatus?, permissions?, createdAt` |
| GET, POST `/api/users/me/addresses` | any user | paged, sort `createdAt, updatedAt, city`. Limit error: `ADDRESS_LIMIT_REACHED` |
| GET, PUT, DELETE `/api/users/me/addresses/{publicId}` | any user | PUT replaces; DELETE 204 |
| GET `/api/merchant/application` | merchant | `status, statusReason?, attemptsUsed, maxAttempts, canResubmit, attemptNo, businessName, documentKeys, submittedAt, decision, decidedAt` |
| POST `/api/merchant/application/resubmit` | merchant | `{ businessName, documentKeys }` |
| POST, GET `/api/merchant/owner/assistants` | merchant | create `{ email, firstName, lastName, nic, phone, permissions[] (non-empty), temporaryPassword }`; list paged, sort `createdAt, lastName, email, assistantStatus` |
| GET `/api/merchant/owner/assistants/{publicId}` | merchant | NIC is masked |
| PUT `/api/merchant/owner/assistants/{publicId}/permissions` | merchant | `{ permissions[] }`; the assistant's tokens are revoked |
| POST `/api/merchant/owner/assistants/{publicId}/ban`, `/unban`, `/remove` | merchant | `{ reason }`; unban can fail with 409 if the NIC is now used elsewhere |
| GET `/api/admin/users` | admin | filters `role, status, q` (email, names, public id); sort `createdAt, email, lastName, status, statusChangedAt`; max size 100 |
| GET `/api/admin/users/{publicId}` | admin | full NIC; real status; `banEffectiveAt, banAnnouncedAt, applicationAttempts, lockedUntil` |
| POST `/api/admin/users/{publicId}/assistant-ban` | admin | `{ reason }`, permanent NIC block |
| GET `/api/admin/merchants/pending` | admin | paged, default sort `createdAt,asc` |
| POST `/api/admin/merchants/{publicId}/approve` | admin | optional `{ note }` |
| POST `/api/admin/merchants/{publicId}/reject`, `/ban`, `/unban` | admin | `{ reason }` |
| POST `/api/admin/customers/{publicId}/ban`, `/unban` | admin | `{ reason }` |
| POST, GET `/api/super-admin/admins` | super admin | create `{ email, firstName, lastName, nic, phone, temporaryPassword }`; list paged |
| POST `/api/super-admin/admins/{publicId}/ban`, `/unban` | super admin | `{ reason }` |

All of these take the USER public id (`USR-...`), not the store id.

### 7.2 Stores (store-service)

| Method and path | Auth | Notes |
|---|---|---|
| GET `/api/public/stores` | public | `q` (max 100), sort `name, rating, newest` (default `name,asc`), paged. Item: `publicId, name, slug, description, city, district, logoUrl, ratingAvg, ratingCount, codEnabled` |
| GET `/api/public/stores/{publicId}` | public | same shape |
| GET `/api/public/stores/{publicId}/reviews` | public | paged, sort `createdAt, rating`. Review: `publicId, rating, text, attachmentUrls, createdAt, reply{text,createdAt}?` |
| POST `/api/customer/stores/{publicId}/reviews` | customer | `{ orderPublicId, rating 1-5, text?, attachmentKeys? }` |
| GET, PUT `/api/merchant/store` | merchant | GET returns 404 until the profile is first saved. PUT `{ name (3-100, unique), description?, contactPhone?, contactEmail?, addressLine?, city?, district?, logoKey? }`. Response has `published, profileComplete, codEnabled, ratingAvg, ratingCount`. Error `STORE_NAME_TAKEN` |
| PUT `/api/merchant/store/cod` | merchant | `{ enabled }` |
| GET, POST `/api/merchant/owner/bank-accounts` | merchant | paged. Create `{ bankCode, branch, accountName, accountNumber, active? }`. Response shows `accountNumberMasked` only |
| GET `/api/merchant/owner/bank-accounts/banks` | merchant | plain array of active banks `{ code, name, active }` |
| GET, PUT, DELETE `/api/merchant/owner/bank-accounts/{publicId}` | merchant | PUT `{ bankCode, branch, accountName, accountNumber? (omit to keep), active }` |
| GET `/api/merchant/owner/couriers` | merchant | plain array of enabled couriers |
| GET `/api/merchant/owner/couriers/available` | merchant | plain array of master couriers |
| PUT `/api/merchant/owner/couriers` | merchant | `{ courierCodes[] (max 20) }` replaces the list |
| GET, POST `/api/merchant/owner/shipping-templates` | merchant | paged. `{ courierCode, name, ruleType, baseAmount?, rates[], active? }`. One template per courier. These are estimates only |
| GET, PUT, DELETE `/api/merchant/owner/shipping-templates/{publicId}` | merchant | |
| GET `/api/merchant/owner/metrics` | merchant | `score, ordersReceived, ordersQuoted, ordersRejected, acceptanceRatePercent, averageResponseMinutes, cancelledOrders, cancellationRatePercent, lateShipments, lateVerifications, complaintsUpheld, completedOrders, revenue, updatedAt` (rates can be null) |
| GET `/api/merchant/reviews` | `REVIEW_REPLY` | store reviews incl. hidden; paged; sort `createdAt, rating` |
| POST `/api/merchant/reviews/{publicId}/reply` | `REVIEW_REPLY` | `{ text }`, one reply per review (`REPLY_ALREADY_EXISTS`) |
| GET `/api/admin/stores`, `/api/admin/stores/{publicId}` | admin | `q` on name; sort `name, createdAt, rating`; item has `ownerStatus, published, acceptingOrders, codEnabled, score` |
| GET `/api/admin/stores/{publicId}/score` | admin | metrics (same shape as above) |
| GET `/api/admin/stores/{publicId}/score-events` | admin | paged: `type, delta, scoreAfter, orderPublicId, createdAt` |
| GET `/api/admin/stores/{publicId}/reviews` | admin | all reviews incl. hidden |
| POST `/api/admin/stores/reviews/{reviewPublicId}/hide`, `/unhide` | admin | `{ reason }` |
| GET `/api/admin/merchants/at-risk` | admin | paged, sort `score, atRiskSince`: `storePublicId, storeName, score, threshold, atRiskSince` |
| GET `/api/admin/banks`, `/api/admin/banks/{code}` | admin | filter `active`; paged, default size 50; sort `code, name` |
| POST, PUT, DELETE `/api/admin/banks[/{code}]` | super admin | create `{ code, name, active? }`; PUT `{ name, active }`; DELETE 409 `BANK_IN_USE` |
| GET `/api/admin/couriers[/{code}]` | admin | filter `active` |
| POST, PUT, DELETE `/api/admin/couriers[/{code}]` | super admin | create `{ code, name, trackingUrlTemplate (https, contains {trackingNumber}), trackingNumberRegex, codSupported, active? }`; PUT same minus code, `active` required; DELETE 409 `COURIER_IN_USE` |
| GET `/api/super-admin/settings` | super admin | array: `key, value, type, defaultValue, min, max, updatedAt, updatedBy` |
| PUT `/api/super-admin/settings/{key}` | super admin | `{ value (string), reason? }`; `INVALID_SETTING_VALUE`, `UNKNOWN_SETTING` |
| GET `/api/super-admin/settings/{key}/history` | super admin | paged |
| GET, POST `/api/super-admin/holidays` | super admin | GET filters `from`, `to` (dates), paged, sort `date, name`. POST `{ date, name, type }`; `HOLIDAY_DATE_TAKEN` |
| PUT, DELETE `/api/super-admin/holidays/{publicId}` | super admin | |
| POST `/api/super-admin/merchants/{storePublicId}/credits` | super admin | `{ amount > 0, reason }` |
| GET `/api/super-admin/merchants/{storePublicId}/ledger` | super admin | `balance, enforced (always false), entries` (paged) |

Settings keys (all editable): `timers.merchant-response-hours, timers.customer-confirmation-hours, timers.payment-submission-hours, timers.payment-verification-hours, timers.ship-by-hours, timers.auto-complete-days, timers.ban-grace-days, score.customer.completed, score.customer.declined, score.customer.expired, cod.objection-window-days, score.customer.cod-refusal-limit, score.customer.cod-suspension-months, score.merchant.completed, score.merchant.response-timeout, score.merchant.late-shipment, score.merchant.late-verification, score.merchant.complaint-upheld, score.merchant.at-risk-threshold, orders.max-open-unconfirmed-per-customer, orders.max-quote-revisions, complaints.window-days, merchant.max-application-attempts, auth.access-token-minutes, auth.refresh-days, auth.max-failed-logins, auth.lockout-minutes, fees.monthly-lkr, fees.per-order-lkr, fees.enforced`. Render the settings page from the API response (type, min, max); do not hard-code the list. `fees.enforced` accepts only `false`.

### 7.3 Catalog (product-service)

| Method and path | Auth | Notes |
|---|---|---|
| GET `/api/public/categories` | public | plain array `{ slug, name, description, parentSlug, active }` (flat; build the tree from `parentSlug`; parents are top-level only) |
| GET `/api/public/products` | public | query: `q, category (slug, includes children), store (STR-...), minPrice, maxPrice, inStock (bool), minRating (0-5), sort, page, size (max 50)`. `sort` is one of `relevance` (default), `price`, `price,asc`, `price,desc`, `newest`, `rating`. Item: `publicId, name, category{slug,name}, store{publicId,name}, imageUrl, price (effective, "from" price), listPrice, discounted, inStock, ratingAvg, ratingCount` |
| GET `/api/public/products/{publicId}` | public | `description, codAllowed, imageUrls, options[{name,values}], variants[{publicId,label,attributes,listPrice,effectivePrice,discount{type,value,amount,endsAt,name}?,inStock,lowStock,imageUrls}]`. No stock counts are exposed |
| GET `/api/public/products/{publicId}/reviews` | public | paged, sort `createdAt, rating`. Review has `variantLabel` |
| POST `/api/customer/products/{publicId}/reviews` | customer | `{ orderPublicId, variantPublicId? (only when the order has several variants of this product), rating 1-5, text?, attachmentKeys? }`; `REVIEW_NOT_ELIGIBLE`, `REVIEW_ALREADY_EXISTS` |
| GET `/api/merchant/products` | product read perms | `status, q`; sort `createdAt, updatedAt, name`. Summary: `publicId, name, category, status, variantCount, activeVariantCount, minListPrice, totalAvailable, totalReserved, ratingAvg, ratingCount, updatedAt` |
| GET `/api/merchant/products/{publicId}` | product read perms | full aggregate: `status, codAllowed, imageKeys, imageUrls, options, variants[{publicId, sku, attributes, label, listPrice, effectivePrice, discount, status, imageKeys, stock{quantityAvailable, reservedQuantity, version}}], version` |
| POST, PUT `/api/merchant/products[/{publicId}]` | `PRODUCT_EDIT` | body `{ name, description?, categorySlug, codAllowed?, imageKeys?, options? (max 5: {name, values[]}), variants? (max 100), sku?, listPrice?, initialStock? }`. Variant: `{ publicId? (PUT: existing variant), sku, attributes{option:value} (must cover every option), listPrice >= 0.01, status?, imageKeys?, initialStock? (new variants only) }`. A simple product sends `sku + listPrice + initialStock` instead of `variants`. On PUT, variants not listed become INACTIVE. New products start as DRAFT. Errors `SKU_TAKEN`, `INVALID_VARIANTS` |
| POST `/api/merchant/products/{publicId}/status` | `PRODUCT_EDIT` | `{ status }`. ACTIVE needs an active variant and an approved merchant (`MERCHANT_NOT_APPROVED`) |
| DELETE `/api/merchant/products/{publicId}` | `PRODUCT_EDIT` | archives (returns the product) |
| PATCH `/api/merchant/variants/{publicId}/stock` | `STOCK_EDIT` | `{ mode: SET or DELTA, quantity, reason, expectedVersion? }`; 409 on negative result or version mismatch. Always send `expectedVersion` from the last read |
| GET, POST `/api/merchant/discounts` | `DISCOUNT_MANAGE` | GET filter `product` (ITM-...), sort `createdAt, startsAt, endsAt`. Body `{ name?, scope, productPublicId?, variantPublicId?, type, value, startsAt?, endsAt?, active? }`; `INVALID_DISCOUNT`. Response has `live` |
| GET, PUT, DELETE `/api/merchant/discounts/{publicId}` | `DISCOUNT_MANAGE` | |
| GET `/api/merchant/products/reviews` | `REVIEW_REPLY` | filter `product` |
| POST `/api/merchant/products/reviews/{reviewPublicId}/reply` | `REVIEW_REPLY` | `{ text }` |
| GET, POST, PUT, DELETE `/api/admin/categories[/{slug}]` | admin | plain array on list. Body `{ slug, name, description?, parentSlug?, active? }`; DELETE 409 `CATEGORY_IN_USE` (deactivate instead); `CATEGORY_SLUG_TAKEN`, `CATEGORY_NAME_TAKEN` |
| GET `/api/admin/products` | admin | `store` (STR-..., REQUIRED), `status, q`; read-only |
| GET `/api/admin/products/{publicId}` | admin | |
| GET `/api/admin/reviews` | admin | `product` (REQUIRED) |
| POST `/api/admin/reviews/{reviewPublicId}/hide`, `/unhide` | admin | `{ reason }` |

### 7.4 Orders (order-service)

| Method and path | Auth | Notes |
|---|---|---|
| GET `/api/customer/cart` | customer | `{ stores[{storePublicId, storeName, lines[], subtotal}], lineCount, itemsTotal }`. Line: `cartItemPublicId, variantPublicId, itemPublicId, productName, variantName, sku, attributes, imageUrl, quantity, listPrice, discountAmount, unitPrice, lineTotal, availableQuantity, available, codAllowed, issue?`. Re-priced live on every read |
| POST `/api/customer/cart/items` | customer | `{ variantPublicId, quantity 1-100 }`; returns the cart. `CART_FULL`, `VARIANT_NOT_AVAILABLE`, `INSUFFICIENT_STOCK` |
| PUT, DELETE `/api/customer/cart/items/{cartItemId}` | customer | PUT `{ quantity }`; both return the cart |
| DELETE `/api/customer/cart` | customer | empties the cart |
| POST `/api/customer/checkout` | customer | Header `Idempotency-Key`. Body `{ cartItemIds[] (max 100), addressPublicId, payments[{ storePublicId, method }] }`. NOTE: the field is `storePublicId` (the design doc says `storeId`; the code is right). Response `{ checkoutPublicId?, results[{ storePublicId, storeName, status PLACED or FAILED, orderPublicId?, paymentMethod?, grandTotal?, code?, message? }] }`. HTTP 201 when at least one store was placed, **HTTP 422 with this same body when none was placed**: read `error.response.data` and show per-store reasons, do not treat it as a generic error. Failed lines stay in the cart. Per-store codes: `STORE_NOT_ACCEPTING_ORDERS, CUSTOMER_BLOCKED_BY_STORE, COD_NOT_AVAILABLE_FOR_STORE, COD_NOT_ALLOWED_FOR_PRODUCT, COD_SUSPENDED, OPEN_ORDER_LIMIT_REACHED, VARIANT_NOT_AVAILABLE, INSUFFICIENT_STOCK`. Whole-request codes: `CUSTOMER_BANNED, ADDRESS_NOT_FOUND, CART_ITEM_NOT_FOUND, PAYMENT_METHOD_MISSING` |
| GET `/api/customer/orders` | customer | `status` (list), paged, sort `placedAt, updatedAt, grandTotal, status, deadlineAt` (default `placedAt,desc`). Summary: `publicId, storePublicId, storeName, customerPublicId, status, paymentMethod, itemCount, grandTotal, deadlineAt, deadlineType, flags, placedAt, updatedAt` |
| GET `/api/customer/orders/{publicId}` | customer | full order (section 8). Other customers' orders are 404 |
| POST `/api/customer/orders/{id}/cancel` | customer | only in AWAITING_MERCHANT, free |
| POST `/api/customer/orders/{id}/confirm`, `/decline` | customer | quote answer; decline costs score |
| GET `/api/customer/orders/{id}/bank-accounts` | customer | plain array with FULL account numbers: `publicId, bankCode, bankName, branch, accountName, accountNumber`. Only while `AWAITING_PAYMENT` or `PAYMENT_SUBMITTED` on a bank-transfer order. Never cache or log |
| POST `/api/customer/orders/{id}/payments` | customer | Header `Idempotency-Key`. `{ referenceNumber, sourceBankCode, sourceAccountNumber, storeBankAccountPublicId, attachmentKeys? }`. A reference already used with the same bank gives 409 `PAYMENT_REJECTED` (flagged to admins). Use a neutral message; do not reveal who used it |
| POST `/api/customer/orders/{id}/received` | customer | SHIPPED to COMPLETED |
| POST `/api/customer/orders/{id}/cod-objection` | customer | `{ text }` (inferred: only for a COD refusal, inside `cod.objection-window-days`); `OBJECTION_NOT_ALLOWED`, `OBJECTION_ALREADY_EXISTS` |
| POST, GET `/api/customer/complaints`, GET `/{publicId}` | customer | create `{ orderPublicId, type, text, attachmentKeys? }`; sort `createdAt, updatedAt, status`. `COMPLAINT_NOT_ALLOWED` |
| GET `/api/merchant/orders`, `/{publicId}` | `ORDER_VIEW` | same list shape and filters. Detail includes `customer{score, codRefusals, codSuspended}` |
| POST `/api/merchant/orders/{id}/reject` | `ORDER_QUOTE` | `{ reasonCode, note? }` (no penalty) |
| POST `/api/merchant/orders/{id}/quote` | `ORDER_QUOTE` | `{ lines[{variantPublicId, quantity}] (quantity may only go down; 0 or omitted removes the line; at least one line must remain), courierCode (one of the store's couriers; must support COD for COD orders), courierCharge >= 0 (mandatory), otherCharges[{label, amount>0}] (max 10), quoteDiscount? }`. Errors `INVALID_QUOTE, COURIER_NOT_AVAILABLE, QUOTE_REVISION_LIMIT_REACHED` |
| POST `/api/merchant/orders/{id}/payment/verify` | `PAYMENT_VERIFY` | no body |
| POST `/api/merchant/orders/{id}/payment/reject` | `PAYMENT_VERIFY` | `{ reason }` |
| POST `/api/merchant/orders/{id}/ship` | `ORDER_SHIP` | `{ courierCode, trackingNumber (letters, digits, dash, max 64; must match the courier's regex) }`; `INVALID_TRACKING_NUMBER` |
| POST `/api/merchant/orders/{id}/delivery-failed` | `ORDER_SHIP` | `{ type, note? }` |
| GET `/api/merchant/orders/complaints`, `/{publicId}` | `ORDER_VIEW` | |
| POST `/api/merchant/orders/complaints/{id}/response` | `ORDER_QUOTE` | `{ response }`, once (`COMPLAINT_ALREADY_RESPONDED`) |
| GET, POST `/api/merchant/customer-blocks` | `CUSTOMER_BLOCK` | POST `{ customerPublicId, reason }` (customer must have ordered from the store). Get the customer id from an order |
| DELETE `/api/merchant/customer-blocks/{customerPublicId}?reason=` | `CUSTOMER_BLOCK` | 204 |
| GET `/api/admin/orders` | admin | `status` (list), `needsResolution` (bool: open orders of banned merchants), paged, max size 100 |
| GET `/api/admin/orders/{publicId}` | admin | |
| POST `/api/admin/orders/{publicId}/resolve` | admin | `{ action, reason }` |
| GET `/api/admin/orders/cod-objections` | admin | filter `status`; sort `createdAt, status` |
| POST `/api/admin/orders/{publicId}/cod-objection/decision` | admin | `{ decision, note }` |
| GET `/api/admin/complaints`, `/{publicId}` | admin | filter `status` (list) |
| POST `/api/admin/complaints/{publicId}/decision` | admin | `{ decision, notes }` |
| GET `/api/admin/flagged-references`, `/{publicId}` | admin | filter `status`. Item: `publicId, orderPublicId, customerPublicId, storePublicId, reference, bankCode, originalOrderPublicId, status, reviewNote, reviewedBy, reviewedAt, createdAt` |
| POST `/api/admin/flagged-references/{publicId}/review` | admin | `{ action, note }` |
| GET `/api/admin/customers/{customerPublicId}/score` | admin | `score, codRefusals, codRefusalsTowardSuspension, codSuspended, codSuspendedUntil, recentEvents[{type, delta, createdAt}]` |

## 8. Order detail shape and lifecycle

Order fields: `publicId, checkoutPublicId, storePublicId, storeName, customerPublicId, status, paymentMethod, items[{itemPublicId, variantPublicId, name, variantName, sku, attributes, orderedQuantity, quantity, listPrice, discountAmount, unitPrice, lineTotal}], amounts{itemsTotal, courierCode, courierCharge, otherCharges[{label,amount}], otherChargesTotal, quoteDiscount, grandTotal}, deadlineAt, deadlineType, quoteRevision, shippingAddress, contact{name,phone,email}, shipment{courierCode, courierName, trackingNumber, trackingUrl, shippedAt}, payments[{publicId, status, referenceNumber, sourceBankCode, sourceAccountMasked, destinationBankCode, storeBankAccountPublicId, attachmentUrls, submittedAt, decidedAt, rejectionReason}], reasonCode, reason, deliveryFailureType, flags{needsAdminResolution, lateShipment, lateVerification}, timeline{placedAt, quotedAt, confirmedAt, paymentSubmittedAt, paymentVerifiedAt, readyToShipAt, shippedAt, completedAt, deliveryFailedAt, closedAt}, customer{score, codRefusals, codSuspended}`. Absent fields are omitted. `customer` appears for store and admin only. `orderedQuantity` is what the customer asked for, `quantity` is what the quote kept.

Happy paths: COD: AWAITING_MERCHANT, AWAITING_CUSTOMER_CONFIRMATION, READY_TO_SHIP, SHIPPED, COMPLETED. Bank transfer: AWAITING_MERCHANT, AWAITING_CUSTOMER_CONFIRMATION, AWAITING_PAYMENT, PAYMENT_SUBMITTED, READY_TO_SHIP, SHIPPED, COMPLETED.

| Status | Customer can | Store can (permission) | Automatic |
|---|---|---|---|
| AWAITING_MERCHANT | cancel (free) | quote, reject (`ORDER_QUOTE`) | deadline `MERCHANT_RESPONSE` ends in EXPIRED_MERCHANT |
| AWAITING_CUSTOMER_CONFIRMATION | confirm; decline (score penalty) | re-quote, limited by `quoteRevision` against `orders.max-quote-revisions` | deadline `CUSTOMER_CONFIRMATION` ends in EXPIRED_CUSTOMER (penalty) |
| AWAITING_PAYMENT (bank) | view store bank accounts; submit transfer | nothing | deadline `PAYMENT_SUBMISSION` ends in EXPIRED_PAYMENT (penalty) |
| PAYMENT_SUBMITTED | wait | verify, or reject with reason (back to AWAITING_PAYMENT; customer may resubmit before the original deadline) (`PAYMENT_VERIFY`) | deadline `PAYMENT_VERIFICATION` only sets `flags.lateVerification` |
| READY_TO_SHIP | file a complaint | ship (`ORDER_SHIP`) | deadline `SHIP_BY` only sets `flags.lateShipment` |
| SHIPPED | mark received; complaint | delivery-failed (`ORDER_SHIP`) | deadline `AUTO_COMPLETE` completes the order |
| COMPLETED | review store and product; complaint within `complaints.window-days` | none | none |
| DELIVERY_FAILED | object to a COD refusal (inferred) | none | none |
| Other terminals | view only | none | none |

Admins can `resolve` any open order (FORCE_COMPLETE or CANCEL), mainly those with `flags.needsAdminResolution`. A deadline can be near a Sri Lankan holiday; the server already skips holidays, so always display `deadlineAt` as given and never compute your own.

## 9. Error codes and the UX they need

- Always: `VALIDATION_FAILED` (show `fieldErrors` inline), `MALFORMED_REQUEST`, `BAD_REQUEST`, `INVALID_SORT`, `NOT_FOUND` (also returned for other people's data), `CONCURRENT_MODIFICATION` (409: reload and retry), `INTERNAL_ERROR`, `SERVICE_UNAVAILABLE` (retry button), `RATE_LIMITED` (use `Retry-After`).
- Auth: `UNAUTHORIZED`, `TOKEN_REVOKED` (session ended; sign in again), `ACCESS_DENIED` (403), `PASSWORD_CHANGE_REQUIRED`, `INVALID_CREDENTIALS`, `TOO_MANY_LOGIN_ATTEMPTS`, `ACCOUNT_BANNED`, `ACCOUNT_REMOVED`, `MERCHANT_BANNED`, `WEAK_PASSWORD`, `PASSWORD_REUSED`.
- Accounts: `EMAIL_ALREADY_EXISTS`, `NIC_ALREADY_ASSIGNED`, `INVALID_STATUS_TRANSITION`, `MERCHANT_NOT_ACTIVE`, `MERCHANT_NOT_APPROVED`, `APPLICATION_LIMIT_REACHED`, `ADDRESS_LIMIT_REACHED`.
- Store: `STORE_NAME_TAKEN`, `STORE_PROFILE_REQUIRED` (send the merchant to the profile form), `BANK_ACCOUNT_LIMIT_REACHED`, `BANK_NOT_AVAILABLE`, `COURIER_NOT_ENABLED`, `SHIPPING_TEMPLATE_EXISTS`, `BANK_CODE_TAKEN`, `COURIER_CODE_TAKEN`, `HOLIDAY_DATE_TAKEN`.
- Catalog and stock: `SKU_TAKEN`, `INVALID_VARIANTS`, `PRODUCT_NOT_SELLABLE`, `INSUFFICIENT_STOCK`, `VARIANT_NOT_AVAILABLE`, `INVALID_DISCOUNT`, `CATEGORY_*`.
- Orders: `INVALID_ORDER_STATE` (reload the order), `ACTION_NOT_PERMITTED`, `DEADLINE_PASSED`, `INVALID_QUOTE`, `QUOTE_REVISION_LIMIT_REACHED`, `COURIER_NOT_AVAILABLE`, `INVALID_TRACKING_NUMBER`, `PAYMENT_REJECTED`, `BANK_ACCOUNT_NOT_AVAILABLE`, `IDEMPOTENCY_*`, `OBJECTION_*`, `COMPLAINT_*`, `CUSTOMER_ALREADY_BLOCKED`, `FLAG_ALREADY_REVIEWED`.
- Reviews: `REVIEW_NOT_ELIGIBLE`, `REVIEW_ALREADY_EXISTS`, `REPLY_ALREADY_EXISTS`.

## 10. Known gaps and traps (design around them; do not invent endpoints)

1. **No upload API.** Images, documents and attachments are opaque storage keys; the backend accepts any key matching the regex and returns URLs under `https://images.example.invalid/...`, which will not load. The UI lets users pick files, but only generates keys (for example `uploads/<uuid>/<sanitised-name>`); nothing is uploaded. Show a clear "uploads are simulated" notice and give every `<img>` an `onError` fallback (neutral tile with initials or an icon).
2. **Admin merchant approval screen is thin.** `AdminUserResponse` has no `businessName` or `documentKeys`, so the pending list can only show email, name, NIC, phone, `applicationAttempts` and dates.
3. **Store to owner link is missing for admins.** Admin store lists, at-risk lists and flagged references carry store public ids, but merchant ban, unban, approve and reject need the OWNER's user public id, which no store response includes. Until the backend adds an owner id, the UI sends admins to the user search (`/api/admin/users?role=ROLE_MERCHANT&q=`) to find the account.
4. **No endpoints for:** dashboard statistics, audit logs, notifications, forgot or reset password, email or phone verification, a customer's own score or COD suspension, own-review lists, review eligibility, shipping estimates. Dashboards are built from list `totalElements` (for example `size=1` queries). A customer learns about a COD suspension only from `COD_SUSPENDED` at checkout. Show "Write a review" on completed orders and handle `REVIEW_NOT_ELIGIBLE` and `REVIEW_ALREADY_EXISTS`.
5. **Cart groups lack `codEnabled`.** Fetch `GET /api/public/stores/{storePublicId}` per store to know whether COD is offered; combine with each line's `codAllowed`.
6. **Merchant store profile is a 404 before the first save.** Treat it as "set up your store", not an error.
7. **Checkout 422** carries a normal body; see 7.4.
8. **Access token carries `status`**, but it can be stale; refresh the profile from `/api/users/me` after login, after refresh and when a 403 or 409 suggests a status change.
9. **Public store and product search only returns visible stores and products.** A product page can 404 when the store was hidden.
10. **Rounded display only.** Never sum or multiply money client-side for anything the server will charge.