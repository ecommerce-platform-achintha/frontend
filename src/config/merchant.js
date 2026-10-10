// Seller-center rules and labels (contract sections 4, 5, 7 and 8). Pages read these instead of re-deriving them.
import { ORDER_STATUS as S } from './enums'
import { CLOSED_ORDER_STATUSES } from './orders'
import { PERMS } from './permissions'

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------

// Tabs on /merchant/orders. `statuses` is sent as repeated `status` params; empty = all.
export const MERCHANT_ORDER_TABS = [
  { value: 'quote', label: 'Needs quote', statuses: [S.AWAITING_MERCHANT] },
  { value: 'verify', label: 'Verify payments', statuses: [S.PAYMENT_SUBMITTED] },
  { value: 'ship', label: 'Ready to ship', statuses: [S.READY_TO_SHIP] },
  { value: 'shipped', label: 'Shipped', statuses: [S.SHIPPED] },
  { value: 'closed', label: 'Closed', statuses: [S.COMPLETED, ...CLOSED_ORDER_STATUSES] },
  { value: 'all', label: 'All', statuses: [] },
]

// Deadlines the store has to act on (or that end the order automatically).
export const MERCHANT_DEADLINE_TYPES = ['MERCHANT_RESPONSE', 'PAYMENT_VERIFICATION', 'SHIP_BY', 'AUTO_COMPLETE']

export const DEADLINE_LABELS = {
  MERCHANT_RESPONSE: 'Quote or reject by',
  PAYMENT_VERIFICATION: 'Verify the payment by',
  SHIP_BY: 'Ship by',
  AUTO_COMPLETE: 'Completes automatically',
}

// Store actions per status (contract section 8). Permissions are checked separately.
export const MERCHANT_CAN = {
  quote: (o) => o?.status === S.AWAITING_MERCHANT || o?.status === S.AWAITING_CUSTOMER_CONFIRMATION,
  reject: (o) => o?.status === S.AWAITING_MERCHANT,
  verifyPayment: (o) => o?.status === S.PAYMENT_SUBMITTED,
  ship: (o) => o?.status === S.READY_TO_SHIP,
  deliveryFailed: (o) => o?.status === S.SHIPPED,
}

// Store-side wording where the shared labels speak to the customer.
export const MERCHANT_STATUS_LABELS = {
  [S.AWAITING_MERCHANT]: 'Needs your quote',
  [S.AWAITING_CUSTOMER_CONFIRMATION]: 'Awaiting customer',
  [S.REJECTED_BY_MERCHANT]: 'Rejected by you',
  [S.EXPIRED_MERCHANT]: 'Not answered in time',
}

export const MERCHANT_TERMINAL_TEXT = {
  [S.COMPLETED]: 'This order is complete.',
  [S.CANCELLED_BY_CUSTOMER]: 'The customer cancelled this order before it was quoted.',
  [S.REJECTED_BY_MERCHANT]: 'Your store rejected this order.',
  [S.EXPIRED_MERCHANT]: 'The order was not quoted or rejected in time, so it closed.',
  [S.DECLINED_BY_CUSTOMER]: 'The customer declined the quote.',
  [S.EXPIRED_CUSTOMER]: 'The customer did not confirm the quote in time.',
  [S.EXPIRED_PAYMENT]: 'The customer did not pay in time.',
  [S.DELIVERY_FAILED]: 'The delivery could not be completed.',
  [S.CANCELLED_BY_SYSTEM]: 'This order was cancelled automatically.',
  [S.CLOSED_BY_ADMIN]: 'This order was closed by the marketplace team.',
}

export const REJECTION_REASON_LABELS = {
  OUT_OF_STOCK: 'Out of stock',
  LOW_CUSTOMER_SCORE: 'Low customer score',
  COD_HISTORY: 'Cash on delivery history',
  CANNOT_DELIVER_TO_AREA: 'Cannot deliver to this area',
  OTHER: 'Other',
}

export const DELIVERY_FAILURE_LABELS = {
  COD_REFUSED: 'The customer refused to pay cash on delivery',
  UNDELIVERABLE: 'The parcel could not be delivered',
}

export const MAX_OTHER_CHARGES = 10
// Tracking number: letters, digits and dashes, max 64 (the courier's own regex is checked too).
export const TRACKING_NUMBER_REGEX = /^[A-Za-z0-9-]{1,64}$/

// ---------------------------------------------------------------------------
// Complaints
// ---------------------------------------------------------------------------
export const MERCHANT_COMPLAINT_TABS = [
  { value: 'open', label: 'Open', statuses: ['OPEN', 'UNDER_REVIEW'] },
  { value: 'decided', label: 'Decided', statuses: ['UPHELD', 'DISMISSED'] },
  { value: 'all', label: 'All', statuses: [] },
]

// ---------------------------------------------------------------------------
// Products, stock and discounts
// ---------------------------------------------------------------------------
export const PRODUCT_TABS = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'ARCHIVED', label: 'Archived' },
  { value: 'all', label: 'All' },
]

// GET /api/merchant/products sort fields: createdAt, updatedAt, name.
export const MERCHANT_PRODUCT_SORT_OPTIONS = [
  { value: 'updatedAt,desc', label: 'Recently updated' },
  { value: 'createdAt,desc', label: 'Newest first' },
  { value: 'createdAt,asc', label: 'Oldest first' },
  { value: 'name,asc', label: 'Name (A to Z)' },
  { value: 'name,desc', label: 'Name (Z to A)' },
]

// Button text for each allowed status move (PRODUCT_STATUS_MOVES in enums.js).
export const PRODUCT_STATUS_ACTIONS = {
  'DRAFT>ACTIVE': 'Activate',
  'DRAFT>ARCHIVED': 'Archive',
  'ACTIVE>DRAFT': 'Back to draft',
  'ACTIVE>ARCHIVED': 'Archive',
  'ARCHIVED>DRAFT': 'Restore to draft',
}

export const PRODUCT_LIMITS = {
  description: 5000,
  options: 5,
  variants: 100,
  images: 10,
}

export const DISCOUNT_SORT = 'createdAt,desc'
export const PERCENT_RANGE = { min: 1, max: 90 }

// ---------------------------------------------------------------------------
// Reviews
// ---------------------------------------------------------------------------
export const REPLY_TEXT_MAX = 2000

// ---------------------------------------------------------------------------
// Assistants
// ---------------------------------------------------------------------------

// Plain descriptions for the permission checkboxes (contract section 4).
export const PERM_DESCRIPTIONS = {
  [PERMS.ORDER_VIEW]: 'See orders and complaints, with customer contact details and delivery addresses.',
  [PERMS.ORDER_QUOTE]: 'Send and change quotes, reject new orders and answer complaints.',
  [PERMS.PAYMENT_VERIFY]: 'Confirm or reject bank transfers. Only give this to someone who can check the bank account.',
  [PERMS.ORDER_SHIP]: 'Mark orders as shipped with a tracking number, and report failed deliveries.',
  [PERMS.PRODUCT_EDIT]: 'Create and edit products, change their status and archive them.',
  [PERMS.STOCK_EDIT]: 'Change stock levels. Every change needs a reason.',
  [PERMS.DISCOUNT_MANAGE]: 'Create, edit and delete discounts.',
  [PERMS.CUSTOMER_BLOCK]: 'Block and unblock customers from ordering from your store.',
  [PERMS.REVIEW_REPLY]: 'Read store and product reviews and reply to them.',
}

export const ASSISTANT_SORT = 'createdAt,desc'

// ---------------------------------------------------------------------------
// Metrics (GET /api/merchant/owner/metrics). Rates can be null: show "n/a".
// kind: count | percent | minutes | money | score | date
// ---------------------------------------------------------------------------
export const METRIC_FIELDS = [
  { key: 'score', label: 'Store score', kind: 'score', help: 'Goes up with completed orders and down with timeouts, late work and upheld complaints. A low score puts the store at risk.' },
  { key: 'ordersReceived', label: 'Orders received', kind: 'count', help: 'All orders customers placed with your store.' },
  { key: 'ordersQuoted', label: 'Orders quoted', kind: 'count', help: 'Orders you answered with a quote.' },
  { key: 'ordersRejected', label: 'Orders rejected', kind: 'count', help: 'Orders you rejected. Rejecting carries no penalty.' },
  { key: 'acceptanceRatePercent', label: 'Acceptance rate', kind: 'percent', help: 'Share of received orders you quoted.' },
  { key: 'averageResponseMinutes', label: 'Average response time', kind: 'minutes', help: 'How long you usually take to quote or reject a new order.' },
  { key: 'cancelledOrders', label: 'Cancelled orders', kind: 'count', help: 'Orders that ended without being completed.' },
  { key: 'cancellationRatePercent', label: 'Cancellation rate', kind: 'percent', help: 'Share of orders that were cancelled.' },
  { key: 'lateShipments', label: 'Late shipments', kind: 'count', help: 'Orders shipped after the ship-by deadline.' },
  { key: 'lateVerifications', label: 'Late payment checks', kind: 'count', help: 'Bank transfers verified after the deadline.' },
  { key: 'complaintsUpheld', label: 'Complaints upheld', kind: 'count', help: 'Complaints the marketplace decided in the customer’s favour.' },
  { key: 'completedOrders', label: 'Completed orders', kind: 'count', help: 'Orders delivered and completed.' },
  { key: 'revenue', label: 'Revenue', kind: 'money', help: 'Total of completed orders, as calculated by the marketplace.' },
]

// Shown on the dashboard card (a subset of METRIC_FIELDS).
export const DASHBOARD_METRICS = [
  'score',
  'acceptanceRatePercent',
  'averageResponseMinutes',
  'cancellationRatePercent',
  'lateShipments',
  'completedOrders',
  'revenue',
]

// ---------------------------------------------------------------------------
// Store setup
// ---------------------------------------------------------------------------
export const STORE_LIMITS = { nameMin: 3, nameMax: 100 }
export const BANK_ACCOUNT_DIGITS = { min: 6, max: 20 }
export const MAX_ENABLED_COURIERS = 20
export const WEIGHT_DECIMALS = 3

export const SHIPPING_RULE_LABELS = {
  FLAT: 'Flat rate',
  PER_DISTRICT: 'Per district',
  WEIGHT_BAND: 'By weight',
}
