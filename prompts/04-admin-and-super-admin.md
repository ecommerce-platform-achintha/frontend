# Prompt 04: Admin and super admin console

Read `docs/frontend-contract.md` fully, then inspect the code from Prompts 01 to 03 and reuse it (API layer, `createPagedResource`, `usePermissions`, `ConfirmDialog` with required reason, StatusBadge, Table, Pagination, Countdown, layouts). Replace the placeholder pages under `/admin/**`. Use only endpoints from the contract.

## Rules

- Admins and the super admin share one layout (`AdminLayout`). Items marked SUPER are rendered only for `ROLE_SUPER_ADMIN` and guarded by `ProtectedRoute`; the backend also enforces this and a 403 shows a friendly message.
- Admin lists allow `size` up to 100 (default 20, size selector 20/50/100). Filters, sort and page live in the URL.
- Every ban, unban, reject, hide, unhide, resolve and decision uses `ConfirmDialog` with a required reason or note (max 500, or the limit stated in the contract). Reasons are shown to the affected user, so the dialog must say so where the contract says so (rejection and ban reasons).
- Accounts are addressed by USER public id (`USR-...`). Stores are addressed by STORE public id (`STR-...`). Do not mix them (contract section 10.3).
- Admin views show the real status, including `BAN_GRACE`. Label it "Ban pending (merchant not told yet)" and explain the 14-day behaviour in one tooltip (the number comes from the setting `timers.ban-grace-days` if the user is the super admin and loaded settings; otherwise do not state a number).
- Show full NIC only on the user detail page, never in lists. Never log personal data.
- Dashboard counts come from list calls with `size=1` reading `totalElements`; there is no statistics endpoint.

## Pages

### Dashboard `/admin`
Cards (each links to its filtered list): merchants waiting for approval (`/api/admin/merchants/pending`), at-risk merchants, open complaints (status OPEN and UNDER_REVIEW), open flagged payment references (status OPEN), open COD objections (status OPEN), orders needing admin resolution (`needsResolution=true`). Load in parallel, each card with its own skeleton and error state. Super admin also gets quick links to settings and holidays.

### Merchant approvals `/admin/merchants/pending`
Paged list (oldest first): name, email, NIC (masked in the list), phone, `applicationAttempts`, created date. Actions: Approve (optional note), Reject (required reason, shown to the merchant). Show a notice that the list cannot display the business name or submitted documents because the backend does not return them (contract section 10.2); do not fake them.

### Users `/admin/users`, `/admin/users/:publicId`
- List filters: role select, status select, free-text `q` (email, names, public id), sort (created, email, last name, status, status changed). Columns: name, email, role, status badge (with the real status), created.
- Detail: all fields from the admin response (full NIC, phone, status, reason, `statusChangedBy`, `statusChangedAt`, `banEffectiveAt`, `banAnnouncedAt`, `applicationAttempts`, `lockedUntil`, assistant status and permissions).
- Actions by role and status (only show what applies, backend remains the authority):
    - Customer: Ban or Unban. Also show the customer's score card from `GET /api/admin/customers/{publicId}/score` (score, COD refusals, refusals toward suspension, suspended until, recent events).
    - Merchant: Approve and Reject when `PENDING_APPROVAL`; Ban when `ACTIVE`; Unban when `BAN_GRACE` or `BANNED`.
    - Assistant: "Ban for misconduct" (permanent NIC block; say so in the dialog).
    - Admin: no actions here; admin bans are SUPER and live on `/admin/admins`.
    - Handle `INVALID_STATUS_TRANSITION` by refetching and explaining.

### Stores `/admin/stores`, `/admin/stores/:publicId`
List with `q`, sort (name, created, rating): name, owner status badge, published, accepting orders, COD, rating, score. Detail: the store fields, `GET .../score` metrics, `GET .../score-events` (paged history), and the store's reviews (including hidden) with Hide and Unhide (reason required). A "Products" tab uses `GET /api/admin/products?store=<STR id>` (read-only; open a product to see variants and prices) and a "Product reviews" action per product using `GET /api/admin/reviews?product=ITM-...` with Hide and Unhide. SUPER: a "Credits and ledger" tab (see below). Add a clearly worded helper "Find the owner account": the store responses do not include the owner's user id (contract section 10.3), so link to `/admin/users?role=ROLE_MERCHANT` and tell the admin to search by the owner's email; the store's contact email is shown but may differ from the account email.

### At-risk merchants `/admin/at-risk`
Paged (sort score, at-risk since): store name, score, threshold, since; row links to the store detail. Copy explains that this is an alert only and nothing is automatic.

### Orders `/admin/orders`, `/admin/orders/:publicId`
List with status multi-select (repeated params), a "Needs resolution" toggle (`needsResolution=true`), sort. Detail reuses the shared order components in read-only mode and adds **Resolve**: action FORCE_COMPLETE or CANCEL with a required reason, shown only for open orders. Explain the difference in the dialog (FORCE_COMPLETE ends as COMPLETED; CANCEL ends as CLOSED_BY_ADMIN).

### Complaints `/admin/complaints`
Paged list with status filter (OPEN, UNDER_REVIEW, UPHELD, DISMISSED); detail shows complaint, attachments, merchant response. **Decision**: UPHELD or DISMISSED with required notes; say UPHELD applies a score penalty to the merchant. Handle `COMPLAINT_ALREADY_DECIDED`. Links to the order and a shortcut to the customer's user page.

### Flagged payment references `/admin/flagged-references`
Paged list with status filter (OPEN, REVIEWED, ESCALATED): reference, bank, order, original order, customer, store, date. **Review** action: REVIEWED or ESCALATED with a required note; ESCALATED explains that the admin then bans the customer or merchant separately from the user page (links provided; for the merchant the owner-account caveat applies). Handle `FLAG_ALREADY_REVIEWED`.

### COD objections `/admin/cod-objections`
Uses `GET /api/admin/orders/cod-objections` with status filter. Show the customer's text, order link and the customer's score card link. **Decision** via `POST /api/admin/orders/{orderPublicId}/cod-objection/decision`: UPHELD (reverses the refusal and lifts a suspension it caused) or DISMISSED, with a required note. Handle `OBJECTION_ALREADY_DECIDED`.

### Categories `/admin/categories`
Tree view from `GET /api/admin/categories` (flat array, parents top-level only), inactive ones dimmed. Create, edit (slug is editable and is the id; warn that changing it changes links), parent select (top-level categories only), active switch. Delete only when unused; on `CATEGORY_IN_USE` offer "Deactivate instead". `CATEGORY_SLUG_TAKEN` and `CATEGORY_NAME_TAKEN` under the fields. Slug auto-suggested from the name, validated by the contract regex.

### Reviews `/admin/reviews`
A moderation entry page: choose a store (search) or paste a product public id, then list reviews (store: `/api/admin/stores/{id}/reviews`; product: `/api/admin/reviews?product=`) with Hide and Unhide. Hidden state, reason and date shown.

### Banks and couriers `/admin/banks`, `/admin/couriers`
Admins: read-only paged lists (default size 50) with an active filter. SUPER: create, edit, delete. Bank: code (regex), name, active. Courier: code, name, tracking URL template (must be https and contain `{trackingNumber}`; validate client-side), tracking number regex (test it with a "try a tracking number" input; catch invalid regex), COD supported, active. `BANK_IN_USE` and `COURIER_IN_USE` offer "Deactivate instead". Codes are immutable after creation.

### SUPER pages
- `/admin/admins`: paged list of admins; create (email, names, NIC, phone, temporary password with the policy checklist; explain it must be changed at first sign-in); Ban and Unban with required reason (banned admins cannot sign in). The super admin account never appears.
- `/admin/settings`: render entirely from `GET /api/super-admin/settings` (key, type, current value, default, min, max, updated by and when). Group by key prefix (`timers`, `score`, `orders`, `complaints`, `merchant`, `auth`, `fees`, `cod`). Inline edit with the right input per `type` (integer with min and max, decimal with 2 places, boolean switch), optional reason, "Reset to default" button, history drawer per key (paged). `fees.enforced` is shown read-only with a note that only `false` is accepted. Show `INVALID_SETTING_VALUE` messages. After a change, say that other services pick it up shortly (cache is about a minute; this is from the design doc, label it approximate).
- `/admin/holidays`: paged list (from and to date filters, sort by date), add, edit and delete holidays with type PUBLIC or POYA; a year selector for quick browsing; `HOLIDAY_DATE_TAKEN` handled. Explain that holidays pause order deadlines.
- `/admin/credits`: pick a store (search by name through the admin stores list), show the ledger (`balance`, `enforced` badge saying fees are recorded but not charged, paged entries with type, amount, order, description, date) and a "Grant credit" form (amount > 0 with 2 decimals, required reason).

## Done when
- A super admin can sign in (forced password change first), create an admin, change a setting and see its history, add a holiday, and grant a credit.
- An admin can approve a merchant, ban and unban a customer and a merchant, decide a complaint, review a flagged reference, decide a COD objection, resolve an order, manage categories and hide a review.
- Admin pages never appear for other roles, and super-admin pages never appear for plain admins.
- `npm run lint` and `npm run build` pass.

## Final report
List created files, contract gaps hit, and what you could not test without a running backend.