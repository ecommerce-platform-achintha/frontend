// Friendly text for error codes (contract section 9 and the checkout codes in 7.4).
// Always branch on `code`; when a code is not listed here, show the server's `message`.

// Codes whose server message carries the useful detail (a reason, a date, a limit): show it as-is.
const PREFER_SERVER_MESSAGE = new Set([
  'COMPLAINT_NOT_ALLOWED',
  'OBJECTION_NOT_ALLOWED',
  'REVIEW_NOT_ELIGIBLE',
  'CUSTOMER_BANNED',
  'ACCOUNT_BANNED',
  'VALIDATION_FAILED',
  'INSUFFICIENT_STOCK',
  // Merchant side: the server message names the field, rule or limit.
  'INVALID_QUOTE',
  'INVALID_VARIANTS',
  'INVALID_DISCOUNT',
  'INVALID_TRACKING_NUMBER',
  'INVALID_STATUS_TRANSITION',
  'APPLICATION_LIMIT_REACHED',
  'BANK_ACCOUNT_LIMIT_REACHED',
  'NIC_ALREADY_ASSIGNED',
])

const MESSAGES = {
  // Always
  NETWORK_ERROR: 'Cannot reach the server. Check your connection and try again.',
  TIMEOUT: 'The server took too long to answer. Please try again.',
  SERVICE_UNAVAILABLE: 'The service is busy right now. Please try again in a moment.',
  INTERNAL_ERROR: 'Something went wrong on our side. Please try again.',
  RATE_LIMITED: 'Too many requests. Please wait a moment and try again.',
  CONCURRENT_MODIFICATION: 'This was changed at the same time somewhere else. We reloaded it; please try again.',
  NOT_FOUND: 'We could not find that. It may have been removed.',
  ACCESS_DENIED: 'You do not have permission for this. If you need it, ask the account owner.',
  INVALID_SORT: 'That sort order is not supported.',

  // Cart and checkout
  CART_FULL: 'Your cart is full. Remove some items before adding more.',
  VARIANT_NOT_AVAILABLE: 'This item is no longer available.',
  PRODUCT_NOT_SELLABLE: 'This product cannot be bought right now.',
  STORE_NOT_ACCEPTING_ORDERS: 'This store is not accepting orders right now.',
  CUSTOMER_BLOCKED_BY_STORE: 'This store cannot accept orders from your account.',
  COD_NOT_AVAILABLE_FOR_STORE: 'This store does not offer cash on delivery. Choose bank transfer.',
  COD_NOT_ALLOWED_FOR_PRODUCT: 'One of these items cannot be paid by cash on delivery. Choose bank transfer.',
  COD_SUSPENDED: 'Cash on delivery is paused for your account. Choose bank transfer.',
  OPEN_ORDER_LIMIT_REACHED: 'You have too many orders waiting for confirmation. Confirm or cancel some first.',
  ADDRESS_NOT_FOUND: 'That address no longer exists. Choose another one.',
  CART_ITEM_NOT_FOUND: 'Your cart changed. We reloaded it; check your selection and try again.',
  PAYMENT_METHOD_MISSING: 'Choose a payment method for every store.',
  IDEMPOTENCY_REQUEST_IN_PROGRESS: 'Your previous attempt is still being processed. Wait a few seconds, then try again.',
  IDEMPOTENCY_KEY_REUSED: 'Something changed since your last attempt. Please press the button again.',
  IDEMPOTENCY_KEY_REQUIRED: 'Please try again.',

  // Orders
  INVALID_ORDER_STATE: 'This order has changed. We reloaded it so you can see the latest status.',
  ACTION_NOT_PERMITTED: 'This action is not available for this order.',
  DEADLINE_PASSED: 'The time for this step has passed.',
  PAYMENT_REJECTED: 'This reference could not be accepted. Check the reference or contact support.',
  BANK_ACCOUNT_NOT_AVAILABLE: 'That store account is no longer available. Choose another one.',
  OBJECTION_ALREADY_EXISTS: 'You already disputed this delivery.',
  COMPLAINT_ALREADY_EXISTS: 'You already filed a complaint for this order.',

  // Reviews
  REVIEW_ALREADY_EXISTS: 'You already reviewed this.',
  REPLY_ALREADY_EXISTS: 'This review already has a reply.',

  // Seller center
  STORE_PROFILE_REQUIRED: 'Set up your store profile first.',
  STORE_NAME_TAKEN: 'Another store already uses this name.',
  MERCHANT_NOT_APPROVED: 'Your account must be approved before products can go live.',
  MERCHANT_NOT_ACTIVE: 'Your account must be approved before adding assistants.',
  QUOTE_REVISION_LIMIT_REACHED: 'This order cannot be re-quoted again: the revision limit was reached.',
  COURIER_NOT_AVAILABLE: 'That courier is not enabled for your store, or it does not support cash on delivery.',
  COURIER_NOT_ENABLED: 'That courier is not enabled for your store.',
  BANK_NOT_AVAILABLE: 'That bank is not available any more. Choose another one.',
  SHIPPING_TEMPLATE_EXISTS: 'This courier already has a shipping template. Edit that one instead.',
  SKU_TAKEN: 'This SKU is already used by another product in your store.',
  COMPLAINT_ALREADY_RESPONDED: 'This complaint already has a response.',
  CUSTOMER_ALREADY_BLOCKED: 'This customer is already blocked.',
  ACCOUNT_REMOVED: 'This account was removed.',

  // Account
  ADDRESS_LIMIT_REACHED: 'You have reached the maximum number of addresses. Delete one to add another.',
  EMAIL_ALREADY_EXISTS: 'An account with this email already exists.',
  NIC_ALREADY_ASSIGNED: 'This NIC is already used by another account.',
  PASSWORD_REUSED: 'Choose a password you have not used before.',
}

/**
 * Text to show for an API error (normalised error object) or a { code, message } pair
 * such as a checkout per-store result.
 */
export function errorMessage(error, fallback = 'Something went wrong. Please try again.') {
  if (!error) return fallback
  const { code, message } = error
  if (code && PREFER_SERVER_MESSAGE.has(code) && message) return message
  return (code && MESSAGES[code]) || message || fallback
}
