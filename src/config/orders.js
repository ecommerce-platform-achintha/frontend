// Order lifecycle rules from contract section 8. Pages read these instead of re-deriving them.
import { ORDER_STATUS as S } from './enums'

// Open = the first six statuses; everything else is terminal.
export const OPEN_ORDER_STATUSES = [
  S.AWAITING_MERCHANT,
  S.AWAITING_CUSTOMER_CONFIRMATION,
  S.AWAITING_PAYMENT,
  S.PAYMENT_SUBMITTED,
  S.READY_TO_SHIP,
  S.SHIPPED,
]

export const isOpenOrder = (status) => OPEN_ORDER_STATUSES.includes(status)

// Happy paths per payment method (for the progress Stepper).
export const HAPPY_PATHS = {
  COD: [S.AWAITING_MERCHANT, S.AWAITING_CUSTOMER_CONFIRMATION, S.READY_TO_SHIP, S.SHIPPED, S.COMPLETED],
  BANK_TRANSFER: [
    S.AWAITING_MERCHANT,
    S.AWAITING_CUSTOMER_CONFIRMATION,
    S.AWAITING_PAYMENT,
    S.PAYMENT_SUBMITTED,
    S.READY_TO_SHIP,
    S.SHIPPED,
    S.COMPLETED,
  ],
}

const STEP_LABELS = {
  [S.AWAITING_MERCHANT]: 'Placed',
  [S.AWAITING_CUSTOMER_CONFIRMATION]: 'Quoted',
  [S.AWAITING_PAYMENT]: 'Payment',
  [S.PAYMENT_SUBMITTED]: 'Verifying',
  [S.READY_TO_SHIP]: 'Ready to ship',
  [S.SHIPPED]: 'Shipped',
  [S.COMPLETED]: 'Completed',
}

/**
 * Steps for the order Stepper.
 * Terminal non-happy statuses mark the step where the order stopped as failed.
 * `stoppedAt` is optional: the last happy status the order reached (unknown from status alone).
 * @returns {{ steps: {key,label}[], currentIndex: number, failed: boolean }}
 */
export function orderProgress(status, paymentMethod, stoppedAt) {
  const path = HAPPY_PATHS[paymentMethod] ?? HAPPY_PATHS.BANK_TRANSFER
  const steps = path.map((key) => ({ key, label: STEP_LABELS[key] }))
  const index = path.indexOf(status)
  if (index >= 0) return { steps, currentIndex: index, failed: false }
  const stoppedIndex = stoppedAt ? Math.max(0, path.indexOf(stoppedAt)) : 0
  return { steps, currentIndex: stoppedIndex, failed: true }
}

// Terminal statuses other than COMPLETED ("Cancelled or closed" tab).
export const CLOSED_ORDER_STATUSES = [
  S.CANCELLED_BY_CUSTOMER,
  S.REJECTED_BY_MERCHANT,
  S.EXPIRED_MERCHANT,
  S.DECLINED_BY_CUSTOMER,
  S.EXPIRED_CUSTOMER,
  S.EXPIRED_PAYMENT,
  S.DELIVERY_FAILED,
  S.CANCELLED_BY_SYSTEM,
  S.CLOSED_BY_ADMIN,
]

// Tabs on /orders. `statuses` is sent as repeated `status` params; empty = all.
export const CUSTOMER_ORDER_TABS = [
  { value: 'active', label: 'Active', statuses: OPEN_ORDER_STATUSES },
  {
    value: 'action',
    label: 'Needs my action',
    statuses: [S.AWAITING_CUSTOMER_CONFIRMATION, S.AWAITING_PAYMENT, S.SHIPPED],
  },
  { value: 'completed', label: 'Completed', statuses: [S.COMPLETED] },
  { value: 'closed', label: 'Cancelled or closed', statuses: CLOSED_ORDER_STATUSES },
  { value: 'all', label: 'All', statuses: [] },
]

// GET /api/customer/orders sort fields: placedAt, updatedAt, grandTotal, status, deadlineAt.
export const ORDER_SORT_OPTIONS = [
  { value: 'placedAt,desc', label: 'Newest first' },
  { value: 'placedAt,asc', label: 'Oldest first' },
  { value: 'updatedAt,desc', label: 'Recently updated' },
  { value: 'deadlineAt,asc', label: 'Deadline soonest' },
  { value: 'grandTotal,desc', label: 'Total: high to low' },
  { value: 'grandTotal,asc', label: 'Total: low to high' },
]

// Deadlines the customer has to act on (list rows show a countdown for these).
export const CUSTOMER_DEADLINE_TYPES = ['CUSTOMER_CONFIRMATION', 'PAYMENT_SUBMISSION']

// Customer actions per status (contract section 8).
export const CUSTOMER_CAN = {
  cancel: (o) => o?.status === S.AWAITING_MERCHANT,
  answerQuote: (o) => o?.status === S.AWAITING_CUSTOMER_CONFIRMATION,
  pay: (o) => o?.status === S.AWAITING_PAYMENT && o?.paymentMethod === 'BANK_TRANSFER',
  markReceived: (o) => o?.status === S.SHIPPED,
  // complaints.window-days limits COMPLETED orders; the server enforces it (COMPLAINT_NOT_ALLOWED).
  complain: (o) => [S.READY_TO_SHIP, S.SHIPPED, S.COMPLETED].includes(o?.status),
  review: (o) => o?.status === S.COMPLETED,
  // Inferred in the contract: only a COD refusal can be disputed.
  objectToCodRefusal: (o) => o?.status === S.DELIVERY_FAILED && o?.deliveryFailureType === 'COD_REFUSED',
}

// Labels for the `timeline` object, in display order.
export const TIMELINE_STEPS = [
  ['placedAt', 'Order placed'],
  ['quotedAt', 'Quote sent by the store'],
  ['confirmedAt', 'Quote confirmed'],
  ['paymentSubmittedAt', 'Payment submitted'],
  ['paymentVerifiedAt', 'Payment verified'],
  ['readyToShipAt', 'Ready to ship'],
  ['shippedAt', 'Shipped'],
  ['completedAt', 'Completed'],
  ['deliveryFailedAt', 'Delivery failed'],
  ['closedAt', 'Closed'],
]

// Plain-language explanation for each terminal status (shown instead of the stepper).
export const TERMINAL_STATUS_TEXT = {
  [S.COMPLETED]: 'This order is complete. Thank you for shopping!',
  [S.CANCELLED_BY_CUSTOMER]: 'You cancelled this order.',
  [S.REJECTED_BY_MERCHANT]: 'The store could not accept this order.',
  [S.EXPIRED_MERCHANT]: 'The store did not respond in time, so the order was closed.',
  [S.DECLINED_BY_CUSTOMER]: 'You declined the store’s quote.',
  [S.EXPIRED_CUSTOMER]: 'The quote was not confirmed in time.',
  [S.EXPIRED_PAYMENT]: 'Payment was not submitted in time.',
  [S.DELIVERY_FAILED]: 'The delivery could not be completed.',
  [S.CANCELLED_BY_SYSTEM]: 'This order was cancelled automatically.',
  [S.CLOSED_BY_ADMIN]: 'This order was closed by the marketplace team.',
}

// Complaint types and text limit (contract 5 and 6).
export const COMPLAINT_TYPE_LABELS = {
  NOT_SHIPPED: 'The order was not shipped',
  WRONG_ITEM: 'I received the wrong item',
  NOT_AS_DESCRIBED: 'The item is not as described',
  PAYMENT_DISPUTE: 'A problem with my payment',
  OTHER: 'Something else',
}
export const COMPLAINT_TEXT_MAX = 4000

// GET /api/customer/complaints sort fields: createdAt, updatedAt, status.
export const COMPLAINT_SORT = 'createdAt,desc'
