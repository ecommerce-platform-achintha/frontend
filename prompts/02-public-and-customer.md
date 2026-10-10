# Prompt 02: Public storefront and customer area

Read `docs/frontend-contract.md` fully, then inspect the code created by Prompt 01 (API layer, `createPagedResource`, auth slice, UI kit, layouts, placeholder routes). Reuse them; do not create parallel versions. Replace the placeholder pages for: `/`, `/search`, `/products/:publicId`, `/stores`, `/stores/:publicId`, `/cart`, `/checkout`, `/orders`, `/orders/:publicId`, `/account/profile`, `/account/addresses`, `/complaints`, `/complaints/:publicId`. Use only endpoints from the contract.

## Rules that apply to every page here

- Public calls (`/api/public/**`) never carry a token (already handled by the interceptor; do not bypass it).
- Every list is server-paginated with the shared Pagination component. Filters, sort and page live in the URL query string (use `useSearchParams`) so refresh and back-button work.
- Each data screen has: skeleton on first load, `ErrorState` with retry, `EmptyState` with a next action.
- Guests who click "Add to cart" or "Buy" go to `/login?next=<current path>`. Signed-in non-customers (merchant, assistant, admin) see a short message "Shopping is available to customer accounts" instead of the cart actions.
- A banned customer (`status === 'BANNED'`) can browse and view orders but cannot add to checkout, confirm quotes or submit payments: disable those buttons with a tooltip showing `statusReason`.
- Map error `code` values using contract section 9. Show `message` as the fallback.
- Images: `onError` fallback tile everywhere. Uploads are simulated (see contract section 10).

## Pages

### Home `/`
Hero with a large search box; category chips (build the tree from `GET /api/public/categories`, parents are top-level only); three product rows using `GET /api/public/products` (sort `newest`, sort `rating`, and `inStock=true`), size 8; a "Stores" row from `GET /api/public/stores` (sort `rating`, size 6). If a row has no data, hide it.

### Search `/search`
Filters: `q`, category (tree select, sends the slug), store (from `?store=STR-...`, shown as a removable chip with the store name when known), price range, in stock, minimum rating. Sort select (Relevance, Price low to high, Price high to low, Newest, Top rated) mapped to the exact values in contract 7.3. Result cards: image, name, store name, "from" price, struck-through list price when `discounted`, rating, out-of-stock badge. Grid on desktop, list on mobile, size selector 12/24/48 (max 50). Filters become a bottom sheet on mobile.

### Product detail `/products/:publicId`
- Gallery from `imageUrls` (product) and the selected variant's `imageUrls` when present.
- Variant picker built from `options` and `variants[].attributes`: one button group per option; disable values that lead to no active or in-stock variant; products without options use their single variant directly. Selected variant drives price (`effectivePrice`, struck `listPrice`, discount name and end date), stock text (In stock / Only a few left from `lowStock` / Out of stock). Never show numeric stock.
- Quantity stepper 1 to 100, "Add to cart" (calls cart API with the selected `variantPublicId`), toast with a link to the cart. Show `codAllowed` as a "Cash on delivery available" or "Bank transfer only" note (store-level COD is checked at checkout).
- Store card (name, link to `/stores/:publicId`), description, reviews list (paged, sort by newest or rating) with the store's reply under each review.
- 404 from the API renders a friendly "no longer available" page with a back-to-search link.

### Stores `/stores` and `/stores/:publicId`
List with search `q` and sort (name, rating, newest). Detail: header (logo fallback, name, city and district, rating, COD badge), the store's products (search page filtered by `store`), and the store's reviews with replies.

### Cart `/cart` (customer only)
- Load with `GET /api/customer/cart`; keep the cart in Redux; show the line count badge in the header on every page after login.
- Group by store (store name links to the store page). Each line: image, names, attributes, quantity stepper (debounced 400 ms, calls PUT, replaces the cart with the response), remove, unit price, discount, line total, availability message from `issue` (`NOT_AVAILABLE`, `INSUFFICIENT_STOCK` with `availableQuantity`, `REMOVED`). Unavailable lines cannot be selected.
- Selection: checkbox per line and per store group; "Select all available". Show the selected items' total using the server's `lineTotal` values (summing server numbers for display is fine; the real total comes from the order). "Clear cart" with confirm.
- Primary button "Checkout (n items)" goes to `/checkout` with the selected `cartItemPublicId`s kept in Redux (not in the URL).

### Checkout `/checkout` (customer only)
1. If nothing is selected, redirect to `/cart`.
2. Address: radio list from `GET /api/users/me/addresses` (size 50) plus an inline "Add address" form using the same form as the addresses page; a default selection is the most recently updated one.
3. Per store in the selection: a payment method choice. COD is offered only if the store's `codEnabled` (fetch `GET /api/public/stores/{storePublicId}` per store, cache it) is true AND every selected line of that store has `codAllowed`; otherwise show Bank transfer only with the reason. Explain in one sentence what happens next: "The store will confirm availability and quote delivery first. You pay or confirm after the quote."
4. Summary of items per store with the note that the delivery charge is added by the store in its quote.
5. Place order: header `Idempotency-Key` from `newIdempotencyKey()`. Rules for the key: create it when the user first presses the button for a given payload (cart item ids + address + payments); keep it if the request fails without a response (network error, timeout, 5xx) so a retry is safe; create a new key when the payload changes and after ANY definitive response (201 or 422), because a replayed 422 would block a corrected retry (assumed behaviour; call it out in a code comment).
6. Handle the response from `response.data` for both 201 and 422: show a result card per store (PLACED with order link and total, FAILED with the mapped message). Placed stores are removed from the cart view by refetching the cart; failed lines remain. If exactly one order was placed go to its detail page; if several go to `/orders`.
7. Whole-request codes (`CUSTOMER_BANNED`, `ADDRESS_NOT_FOUND`, `CART_ITEM_NOT_FOUND`, `PAYMENT_METHOD_MISSING`) show as an inline alert; `CART_ITEM_NOT_FOUND` refetches the cart.

### Orders `/orders`
Tabs mapped to status lists (sent as repeated `status` params): Active (AWAITING_MERCHANT, AWAITING_CUSTOMER_CONFIRMATION, AWAITING_PAYMENT, PAYMENT_SUBMITTED, READY_TO_SHIP, SHIPPED), Needs my action (AWAITING_CUSTOMER_CONFIRMATION, AWAITING_PAYMENT, SHIPPED), Completed, Cancelled or closed (all other terminals), All. Rows: order id, store, status badge, items count, total, a live `Countdown` when the deadline is one the customer cares about (CUSTOMER_CONFIRMATION, PAYMENT_SUBMISSION), placed date. Sort options from the contract.

### Order detail `/orders/:publicId`
- Header: id, store, status badge, payment method, placed date. `Stepper` for the happy path of that payment method (contract section 8); terminal statuses replace the stepper with a clear banner and the `reason` text if present.
- Next-step panel (the main call to action), by status:
    - `AWAITING_MERCHANT`: "Waiting for the store" with countdown and a "Cancel order" button (ConfirmDialog; free of penalty).
    - `AWAITING_CUSTOMER_CONFIRMATION`: show the quote (items kept vs ordered, courier, other charges, quote discount, grand total) and revision count. Buttons "Confirm" and "Decline". Decline text must say it lowers the customer score. Countdown shown.
    - `AWAITING_PAYMENT`: load `GET /api/customer/orders/:id/bank-accounts` (never cache beyond the page; do not log); show each account with a CopyButton on the account number. Payment form: reference, depositing bank, depositing account number, which store account was paid, optional receipt (FilePicker, simulated keys). Depositing bank: no endpoint exists for customers to list banks, so offer a select of the bank codes seen in the store's accounts plus an "Other bank" option with a text input validated against `^[A-Z0-9][A-Z0-9_-]{0,19}$`, and rely on the server's error for anything else. Submit with an `Idempotency-Key` using the same key rules as checkout. `PAYMENT_REJECTED` (409) shows a neutral message ("This reference could not be accepted. Check the reference or contact support.") without hints about who used it.
    - `PAYMENT_SUBMITTED`: show the submitted payment (masked account), "Waiting for the store to verify"; if a payment has `rejectionReason`, show it with the form again (status is back to `AWAITING_PAYMENT` in that case).
    - `READY_TO_SHIP`: "Being prepared"; link to file a complaint.
    - `SHIPPED`: tracking card with courier name, tracking number and a button to the `trackingUrl` (open only if it starts with `https://`, with `rel="noopener noreferrer"`), "I received my parcel" (ConfirmDialog), complaint link.
    - `COMPLETED`: "Write a review" buttons: one for the store, one per distinct product in the order.
    - `DELIVERY_FAILED`: when `deliveryFailureType === 'COD_REFUSED'`, show "Dispute this" opening a modal with a text area (max 2000) that calls `cod-objection`; handle `OBJECTION_NOT_ALLOWED` (window passed) and `OBJECTION_ALREADY_EXISTS`.
- Items table, amounts breakdown (all values straight from the response), shipping address and contact, payments, full timeline from `timeline`.
- After every action, replace the order in Redux with the response. On `INVALID_ORDER_STATE` or `CONCURRENT_MODIFICATION` refetch and tell the user the order changed. Refetch on window focus (no polling needed).
- Reviews: modal with 1 to 5 stars, text (max 2000), optional images (simulated keys). Store review: `orderPublicId`. Product review: also send `variantPublicId`, and when the order has several variants of the same product ask the user to pick which one. Handle `REVIEW_ALREADY_EXISTS` ("You already reviewed this") and `REVIEW_NOT_ELIGIBLE`.

### Complaints `/complaints`, `/complaints/:publicId`
List (paged) with status badges; detail shows type, text, attachments (simulated URLs with fallback), merchant response, admin notes and decision. "New complaint" is started from an order page (query param `?order=ORD-...`): type select, text (max 4000), attachments. Handle `COMPLAINT_NOT_ALLOWED` with the reason shown.

### Account
- `/account/profile`: view email, NIC (full, own data), role, status; edit first name, last name, phone (PUT `/api/users/me`); change-password form (new tokens replace the session; success toast).
- `/account/addresses`: paged list as cards, add, edit (PUT replaces), delete (ConfirmDialog). Form validates phone, postal code and required fields per contract section 6; district is a select of Sri Lankan districts (25) kept in `config/districts.js`; `ADDRESS_LIMIT_REACHED` shows a clear message.

## Done when
- A guest can search, filter, open a product and a store without errors and without an Authorization header on those calls.
- A customer can: add to cart, adjust, check out with Idempotency-Key, see per-store results (including the 422 case), follow an order through quote, confirm, payment submission and receipt, and file a complaint and a review.
- `npm run lint` and `npm run build` pass.

## Final report
List created files, any contract gap you hit, and anything you were unsure about. Do not claim features you did not exercise; say which flows you could not test without a running backend.