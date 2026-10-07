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
