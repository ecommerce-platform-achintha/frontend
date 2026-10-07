// Every enum from contract section 5, plus the badge colour ("tone") for each value.
// StatusBadge reads STATUS_TONES; keep one place for colours.

export const ORDER_STATUS = {
  AWAITING_MERCHANT: 'AWAITING_MERCHANT',
  AWAITING_CUSTOMER_CONFIRMATION: 'AWAITING_CUSTOMER_CONFIRMATION',
  AWAITING_PAYMENT: 'AWAITING_PAYMENT',
  PAYMENT_SUBMITTED: 'PAYMENT_SUBMITTED',
  READY_TO_SHIP: 'READY_TO_SHIP',
  SHIPPED: 'SHIPPED',
  COMPLETED: 'COMPLETED',
  CANCELLED_BY_CUSTOMER: 'CANCELLED_BY_CUSTOMER',
  REJECTED_BY_MERCHANT: 'REJECTED_BY_MERCHANT',
  EXPIRED_MERCHANT: 'EXPIRED_MERCHANT',
  DECLINED_BY_CUSTOMER: 'DECLINED_BY_CUSTOMER',
  EXPIRED_CUSTOMER: 'EXPIRED_CUSTOMER',
  EXPIRED_PAYMENT: 'EXPIRED_PAYMENT',
  DELIVERY_FAILED: 'DELIVERY_FAILED',
  CANCELLED_BY_SYSTEM: 'CANCELLED_BY_SYSTEM',
  CLOSED_BY_ADMIN: 'CLOSED_BY_ADMIN',
}

export const ENUMS = {
  OrderStatus: Object.values(ORDER_STATUS),
  PaymentMethod: ['BANK_TRANSFER', 'COD'],
  DeadlineType: ['MERCHANT_RESPONSE', 'CUSTOMER_CONFIRMATION', 'PAYMENT_SUBMISSION', 'PAYMENT_VERIFICATION', 'SHIP_BY', 'AUTO_COMPLETE'],
  RejectionReason: ['OUT_OF_STOCK', 'LOW_CUSTOMER_SCORE', 'COD_HISTORY', 'CANNOT_DELIVER_TO_AREA', 'OTHER'],
  DeliveryFailureType: ['COD_REFUSED', 'UNDELIVERABLE'],
  ComplaintType: ['NOT_SHIPPED', 'WRONG_ITEM', 'NOT_AS_DESCRIBED', 'PAYMENT_DISPUTE', 'OTHER'],
  ComplaintStatus: ['OPEN', 'UNDER_REVIEW', 'UPHELD', 'DISMISSED'],
  FlagStatus: ['OPEN', 'REVIEWED', 'ESCALATED'],
  ObjectionStatus: ['OPEN', 'UPHELD', 'DISMISSED'],
  ProductStatus: ['DRAFT', 'ACTIVE', 'ARCHIVED'],
  VariantStatus: ['ACTIVE', 'INACTIVE'],
  DiscountScope: ['PRODUCT', 'VARIANT'],
  DiscountType: ['PERCENT', 'FIXED'],
  ShippingRuleType: ['FLAT', 'PER_DISTRICT', 'WEIGHT_BAND'],
  HolidayType: ['PUBLIC', 'POYA'],
  AssistantStatus: ['ACTIVE', 'BANNED_BY_MERCHANT', 'BANNED_BY_ADMIN', 'REMOVED'],
  StockMode: ['SET', 'DELTA'],
  ResolveAction: ['FORCE_COMPLETE', 'CANCEL'],
  Decision: ['UPHELD', 'DISMISSED'], // complaint and objection decisions
  FlagReviewAction: ['REVIEWED', 'ESCALATED'],
  LineIssue: ['NOT_AVAILABLE', 'INSUFFICIENT_STOCK', 'REMOVED'],
  SettingValueType: ['INTEGER', 'DECIMAL', 'BOOLEAN'],
  LedgerEntryType: ['ORDER_FEE', 'MONTHLY_FEE', 'CREDIT'],
  // Account status: users see the first four; admin screens can also see BAN_GRACE.
  UserStatus: ['ACTIVE', 'PENDING_APPROVAL', 'REJECTED', 'BANNED', 'BAN_GRACE'],
}

// Product status moves the backend allows (DRAFT->ACTIVE|ARCHIVED, ACTIVE->DRAFT|ARCHIVED, ARCHIVED->DRAFT).
export const PRODUCT_STATUS_MOVES = {
  DRAFT: ['ACTIVE', 'ARCHIVED'],
  ACTIVE: ['DRAFT', 'ARCHIVED'],
  ARCHIVED: ['DRAFT'],
}

// Tones: neutral, primary, info, success, warning, danger.
export const STATUS_TONES = {
  OrderStatus: {
    AWAITING_MERCHANT: 'warning',
    AWAITING_CUSTOMER_CONFIRMATION: 'warning',
    AWAITING_PAYMENT: 'warning',
    PAYMENT_SUBMITTED: 'info',
    READY_TO_SHIP: 'primary',
    SHIPPED: 'primary',
    COMPLETED: 'success',
    CANCELLED_BY_CUSTOMER: 'neutral',
    REJECTED_BY_MERCHANT: 'danger',
    EXPIRED_MERCHANT: 'neutral',
    DECLINED_BY_CUSTOMER: 'neutral',
    EXPIRED_CUSTOMER: 'neutral',
    EXPIRED_PAYMENT: 'neutral',
    DELIVERY_FAILED: 'danger',
    CANCELLED_BY_SYSTEM: 'neutral',
    CLOSED_BY_ADMIN: 'neutral',
  },
  PaymentMethod: { BANK_TRANSFER: 'info', COD: 'primary' },
  DeadlineType: {
    MERCHANT_RESPONSE: 'warning',
    CUSTOMER_CONFIRMATION: 'warning',
    PAYMENT_SUBMISSION: 'warning',
    PAYMENT_VERIFICATION: 'info',
    SHIP_BY: 'primary',
    AUTO_COMPLETE: 'success',
  },
  RejectionReason: { OUT_OF_STOCK: 'neutral', LOW_CUSTOMER_SCORE: 'warning', COD_HISTORY: 'warning', CANNOT_DELIVER_TO_AREA: 'neutral', OTHER: 'neutral' },
  DeliveryFailureType: { COD_REFUSED: 'danger', UNDELIVERABLE: 'warning' },
  ComplaintType: { NOT_SHIPPED: 'warning', WRONG_ITEM: 'warning', NOT_AS_DESCRIBED: 'warning', PAYMENT_DISPUTE: 'danger', OTHER: 'neutral' },
  ComplaintStatus: { OPEN: 'warning', UNDER_REVIEW: 'info', UPHELD: 'success', DISMISSED: 'neutral' },
  FlagStatus: { OPEN: 'warning', REVIEWED: 'success', ESCALATED: 'danger' },
  ObjectionStatus: { OPEN: 'warning', UPHELD: 'success', DISMISSED: 'neutral' },
  ProductStatus: { DRAFT: 'neutral', ACTIVE: 'success', ARCHIVED: 'warning' },
  VariantStatus: { ACTIVE: 'success', INACTIVE: 'neutral' },
  DiscountScope: { PRODUCT: 'primary', VARIANT: 'info' },
  DiscountType: { PERCENT: 'primary', FIXED: 'info' },
  ShippingRuleType: { FLAT: 'neutral', PER_DISTRICT: 'info', WEIGHT_BAND: 'primary' },
  HolidayType: { PUBLIC: 'primary', POYA: 'warning' },
  AssistantStatus: { ACTIVE: 'success', BANNED_BY_MERCHANT: 'danger', BANNED_BY_ADMIN: 'danger', REMOVED: 'neutral' },
  StockMode: { SET: 'primary', DELTA: 'info' },
  ResolveAction: { FORCE_COMPLETE: 'success', CANCEL: 'danger' },
  Decision: { UPHELD: 'success', DISMISSED: 'neutral' },
  FlagReviewAction: { REVIEWED: 'success', ESCALATED: 'danger' },
  LineIssue: { NOT_AVAILABLE: 'danger', INSUFFICIENT_STOCK: 'warning', REMOVED: 'neutral' },
  SettingValueType: { INTEGER: 'neutral', DECIMAL: 'neutral', BOOLEAN: 'neutral' },
  LedgerEntryType: { ORDER_FEE: 'warning', MONTHLY_FEE: 'warning', CREDIT: 'success' },
  UserStatus: { ACTIVE: 'success', PENDING_APPROVAL: 'warning', REJECTED: 'danger', BANNED: 'danger', BAN_GRACE: 'warning' },
}

// Friendlier labels where the humanised enum reads badly. Everything else uses humanizeEnum().
export const STATUS_LABELS = {
  AWAITING_MERCHANT: 'Awaiting store',
  AWAITING_CUSTOMER_CONFIRMATION: 'Awaiting your confirmation',
  REJECTED_BY_MERCHANT: 'Rejected by store',
  EXPIRED_MERCHANT: 'Store did not respond',
  EXPIRED_CUSTOMER: 'Quote expired',
  EXPIRED_PAYMENT: 'Payment expired',
  BANK_TRANSFER: 'Bank transfer',
  COD: 'Cash on delivery',
  PENDING_APPROVAL: 'Awaiting approval',
  BAN_GRACE: 'Ban grace period',
  COD_REFUSED: 'COD refused',
  POYA: 'Poya',
}
