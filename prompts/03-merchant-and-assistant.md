# Prompt 03: Merchant (owner) and assistant console

Read `docs/frontend-contract.md` fully, then inspect the existing code from Prompts 01 and 02 and reuse it (API layer, `createPagedResource`, permissions config, `usePermissions`, UI kit, status banner, FilePicker, StatusBadge, Countdown). Replace the placeholder pages under `/merchant/**`. Use only endpoints from the contract.

## Rules

- The console serves two roles. The merchant sees everything. An assistant sees only the pages and buttons its `perms` allow (contract section 4). Sidebar items, quick links, buttons and routes are all gated with `usePermissions` and `ProtectedRoute`; the backend still answers 403, which you handle with a friendly message.
- Owner-only pages (store profile, COD, bank accounts, couriers, shipping templates, metrics, assistants, application) must be unreachable for assistants, including by typing the URL.
- Status gating from contract section 4: `PENDING_APPROVAL` banner (store setup and draft products allowed), `REJECTED` redirects to `/merchant/application`, `BANNED` is history-only (hide every mutation).
- Never show, hint at or guess a silent ban grace period.
- Use `ConfirmDialog` with a required reason for ban, unban, remove and delete-like actions that need one.
- Lists are server-paginated with URL-synced filters. Amounts are shown exactly as returned.
- `storeId` comes from the JWT; never send it.

## Pages

### Dashboard `/merchant`
- Owner: a setup checklist computed from real calls: store profile saved (`GET /api/merchant/store`, 404 means not yet), at least one bank account, at least one enabled courier, COD preference set, at least one product, at least one ACTIVE product, assistants (optional). Each item links to its page. Hide the checklist once all required items are done.
- "Work to do" cards built from order list calls with `size=1` and reading `totalElements`: needs a quote (AWAITING_MERCHANT), payments to verify (PAYMENT_SUBMITTED), ready to ship (READY_TO_SHIP), shipped (SHIPPED). Show only the cards the user has `ORDER_VIEW` for; each links to the filtered order list. Also show orders with `flags.lateShipment` or `flags.lateVerification` when visible in the loaded rows.
- Owner: metrics card (`score, acceptanceRatePercent, averageResponseMinutes, cancellationRatePercent, lateShipments, completedOrders, revenue`); null rates show "n/a".
- Assistants without `ORDER_VIEW` see quick links to the pages they can use.

### Orders `/merchant/orders`, `/merchant/orders/:publicId` (needs `ORDER_VIEW`)
- List tabs: Needs quote, Verify payments, Ready to ship, Shipped, Closed, All (repeated `status` params). Row: id, customer score badge only on the detail (not in the list), status, items, total, deadline countdown with a red state for a passed deadline, late flags.
- Detail shows: stepper, status, deadline countdown (merchant-relevant types: MERCHANT_RESPONSE, PAYMENT_VERIFICATION, SHIP_BY, AUTO_COMPLETE), customer insight card (`score`, `codRefusals`, `codSuspended`) with a small explanation, shipping address and contact (needed for delivery), items (`orderedQuantity` vs `quantity`), amounts, payments (masked depositing account, reference, attachments), shipment, timeline.
- Actions by status and permission (use `PermissionButton`):
    - `AWAITING_MERCHANT` or `AWAITING_CUSTOMER_CONFIRMATION` with `ORDER_QUOTE`: **Quote** form. One row per item, quantity input from 0 up to `orderedQuantity` (0 removes the line; at least one line must remain; let the server decide on re-quotes and show `INVALID_QUOTE` clearly), courier, courier charge (mandatory, >= 0), other charges (label and amount, up to 10), quote discount (optional). Courier field: the merchant gets a select from `GET /api/merchant/owner/couriers` (filter by `codSupported` for COD orders); an assistant cannot call that endpoint (owner only), so for assistants show a text input for the courier code (uppercase, validated by regex) and rely on `COURIER_NOT_AVAILABLE` from the server. Say this honestly in a code comment. Show a read-only preview of what the customer will see; the grand total comes from the server response, not from client maths. On a re-quote show `quoteRevision` and handle `QUOTE_REVISION_LIMIT_REACHED`.
    - `AWAITING_MERCHANT` with `ORDER_QUOTE`: **Reject** modal with `reasonCode` select (OUT_OF_STOCK, LOW_CUSTOMER_SCORE, COD_HISTORY, CANNOT_DELIVER_TO_AREA, OTHER) and optional note; text says no penalty applies.
    - `PAYMENT_SUBMITTED` with `PAYMENT_VERIFY`: **Verify** (ConfirmDialog, "Only verify after the money reached the account") and **Reject** (required reason, max 500).
    - `READY_TO_SHIP` with `ORDER_SHIP`: **Ship** form: courier (same owner/assistant rule as above), tracking number. For the owner, validate the tracking number against the courier's `trackingNumberRegex` from the couriers response before sending (anchor it with `^...$`, catch invalid regex safely); always handle `INVALID_TRACKING_NUMBER` from the server.
    - `SHIPPED` with `ORDER_SHIP`: **Delivery failed** with type COD_REFUSED or UNDELIVERABLE and note; explain that a COD refusal counts against the customer and may be disputed.
    - With `CUSTOMER_BLOCK`: "Block this customer" (reason required) using `customerPublicId` from the order.
- After each action replace the order from the response; on `INVALID_ORDER_STATE` or `CONCURRENT_MODIFICATION` refetch and tell the user the order changed.

### Complaints `/merchant/complaints` (needs `ORDER_VIEW`)
List and detail. With `ORDER_QUOTE` the response form is shown once (`COMPLAINT_ALREADY_RESPONDED` handled); afterwards show the admin decision when present.

### Products `/merchant/products`, `/merchant/products/new`, `/merchant/products/:publicId`
Read access needs any of `PRODUCT_EDIT`, `STOCK_EDIT`, `DISCOUNT_MANAGE`.
- List: status tabs (Draft, Active, Archived, All), name search, sort (updated, created, name), columns: name, category, status, variants (active/total), from price, stock available/reserved, rating. Row actions by permission.
- Create and edit form (needs `PRODUCT_EDIT`), sectioned: Basics (name, description max 5000, category from the public category tree, COD allowed switch default on), Images (FilePicker, up to 10 simulated keys), Options and variants. Two modes: **Simple product** (sku, price, initial stock) and **With options** (up to 5 options, each with values; generate the variant matrix as the cartesian product, one row per combination with sku, list price, status, initial stock for new rows; allow removing combinations; each variant may have its own images). Validate SKU and price per contract section 6.
- On edit, the PUT replaces the whole aggregate: send every existing variant with its `publicId`; a variant left out becomes INACTIVE. Warn before saving when the user removed an existing variant. Do not send `initialStock` for existing variants.
- Status actions: Activate (DRAFT to ACTIVE; if the merchant is `PENDING_APPROVAL` or the server answers `MERCHANT_NOT_APPROVED`, explain approval is needed), Back to draft, Archive, Restore to draft. Errors `INVALID_STATUS_TRANSITION`, `PRODUCT_NOT_SELLABLE`, `SKU_TAKEN` (point at the SKU field), `INVALID_VARIANTS`.
- Stock editor per variant (needs `STOCK_EDIT`): shows available and reserved, mode SET or DELTA, quantity, required reason. Always send `expectedVersion` from the last read; on 409 reload the product and show what changed. Reserved units are not editable.

### Discounts `/merchant/discounts` (needs `DISCOUNT_MANAGE`)
List with `live` and `active` badges, optional product filter. Form: name, scope (PRODUCT or VARIANT), product picker (the merchant's products) and variant picker for VARIANT scope, type PERCENT (1 to 90) or FIXED, value, start and end (datetimes entered in Colombo time, sent as UTC ISO strings), active. Explain that only the best single discount applies (no stacking). Edit, delete with confirm. `INVALID_DISCOUNT` message shown inline.

### Reviews `/merchant/reviews` (needs `REVIEW_REPLY`)
Two tabs: Store reviews (`/api/merchant/reviews`) and Product reviews (`/api/merchant/products/reviews`, optional product filter). Show hidden reviews with the admin's hidden reason. Reply form (max 2000), one reply per review (`REPLY_ALREADY_EXISTS`).

### Customer blocks `/merchant/customer-blocks` (needs `CUSTOMER_BLOCK`)
Paged list with reason, who blocked, date; unblock with an optional reason (sent as the `reason` query param on DELETE). Blocking happens from an order (customers are identified by order data), plus a form that accepts a customer public id pasted by the user.

### Owner pages
- `/merchant/application`: status, reason, attempts used of max, latest submission. If `canResubmit`, the resubmit form (business name, 1 to 10 simulated document keys). Show `APPLICATION_LIMIT_REACHED` clearly.
- `/merchant/store`: profile form (name 3 to 100 unique, description, contact phone and email, address, city, district select, logo via FilePicker). First visit with 404 shows the form in "set up your store" mode. Show `published` and `profileComplete` and a plain-language explanation of what is missing. COD switch (`PUT /api/merchant/store/cod`). `STORE_NAME_TAKEN` goes under the name field.
- `/merchant/bank-accounts`: banks from `GET /api/merchant/owner/bank-accounts/banks` in a select; list shows masked numbers only; add, edit (leave the number blank to keep it), delete with confirm, active switch. `BANK_ACCOUNT_LIMIT_REACHED` handled. Never log or store the full number after submit.
- `/merchant/shipping`: two sections. Couriers: checkbox list from `/available`, saved with `PUT /api/merchant/owner/couriers` (replaces the list; confirm when removing). Shipping templates: one per enabled courier (`SHIPPING_TEMPLATE_EXISTS`), rule type FLAT (base amount), PER_DISTRICT (rows of district and amount, optional base amount for other districts), WEIGHT_BAND (rows of max weight kg up to 3 decimals and amount, optional base amount above the heaviest band). Label them clearly as estimates; note in a code comment that no customer-facing estimate endpoint exists, so templates are informational for now.
- `/merchant/assistants`: paged list with status and permission chips; create form (email, names, NIC, phone, permission checkboxes with plain descriptions of the nine permissions, temporary password with the policy checklist and a note that the assistant must change it at first sign-in); detail drawer with permission editing (warn that the assistant is signed out), ban, unban (handle the 409 NIC conflict message), remove (final) each with a required reason. `MERCHANT_NOT_ACTIVE` shows "Your account must be approved before adding assistants".
- `/merchant/metrics`: all metric fields with short explanations, null-safe.

## Done when
- The owner can set up a store from nothing (profile, bank account, courier, product with variants, activate), process an order through quote, verification and shipping, and manage assistants.
- An assistant created with only `ORDER_VIEW` and `ORDER_SHIP` sees only those pages, cannot reach owner pages, and gets friendly messages on forbidden calls.
- `npm run lint` and `npm run build` pass.

## Final report
List created files, contract gaps hit (especially the assistant courier list and the missing customer-facing shipping estimate), and anything untested without a running backend.