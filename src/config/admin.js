// Admin console rules and labels (contract sections 4, 5, 7 and 10). Pages read these instead of re-deriving them.
import { ENUMS, ORDER_STATUS as S } from './enums'
import { ROLE_LABELS, ROLES } from './permissions'

// Admin lists accept up to 100 rows per page.
export const ADMIN_DEFAULT_SIZE = 20

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------
export const ROLE_OPTIONS = Object.values(ROLES).map((r) => ({ value: r, label: ROLE_LABELS[r] }))
export const USER_STATUS_OPTIONS = ENUMS.UserStatus.map((s) => ({
  value: s,
  label: s === 'BAN_GRACE' ? 'Ban pending' : s === 'PENDING_APPROVAL' ? 'Awaiting approval' : s.charAt(0) + s.slice(1).toLowerCase(),
}))

// GET /api/admin/users sort fields: createdAt, email, lastName, status, statusChangedAt.
export const USER_SORT_OPTIONS = [
  { value: 'createdAt,desc', label: 'Newest first' },
  { value: 'createdAt,asc', label: 'Oldest first' },
  { value: 'email,asc', label: 'Email (A to Z)' },
  { value: 'lastName,asc', label: 'Last name (A to Z)' },
  { value: 'status,asc', label: 'Status' },
  { value: 'statusChangedAt,desc', label: 'Status changed recently' },
]

// The real status admins see. BAN_GRACE: the ban is decided but the merchant is not told yet.
export const BAN_GRACE_LABEL = 'Ban pending (merchant not told yet)'
export const BAN_GRACE_SETTING = 'timers.ban-grace-days'

// ---------------------------------------------------------------------------
// Stores
// ---------------------------------------------------------------------------
// GET /api/admin/stores sort fields: name, createdAt, rating.
export const STORE_SORT_OPTIONS = [
  { value: 'name,asc', label: 'Name (A to Z)' },
  { value: 'createdAt,desc', label: 'Newest first' },
  { value: 'rating,desc', label: 'Top rated' },
  { value: 'rating,asc', label: 'Lowest rated' },
]

// GET /api/admin/merchants/at-risk sort fields: score, atRiskSince.
export const AT_RISK_SORT_OPTIONS = [
  { value: 'score,asc', label: 'Lowest score first' },
  { value: 'atRiskSince,asc', label: 'At risk longest' },
  { value: 'atRiskSince,desc', label: 'Newest alerts' },
]

// ---------------------------------------------------------------------------
// Orders and disputes
// ---------------------------------------------------------------------------
export const OPEN_ORDER_STATUS_SET = [
  S.AWAITING_MERCHANT,
  S.AWAITING_CUSTOMER_CONFIRMATION,
  S.AWAITING_PAYMENT,
  S.PAYMENT_SUBMITTED,
  S.READY_TO_SHIP,
  S.SHIPPED,
]

// Admin wording where the shared labels speak to the customer.
export const ADMIN_STATUS_LABELS = { [S.AWAITING_CUSTOMER_CONFIRMATION]: 'Awaiting customer' }

export const RESOLVE_OPTIONS = [
  { value: 'FORCE_COMPLETE', label: 'Force complete', description: 'The order ends as COMPLETED, as if the customer had received it.' },
  { value: 'CANCEL', label: 'Cancel', description: 'The order ends as CLOSED_BY_ADMIN. Nothing is delivered.' },
]

export const COMPLAINT_DECISION_OPTIONS = [
  { value: 'UPHELD', label: 'Uphold', description: 'The customer is right. This applies a score penalty to the merchant.' },
  { value: 'DISMISSED', label: 'Dismiss', description: 'The complaint is not justified. No penalty.' },
]

export const FLAG_REVIEW_OPTIONS = [
  { value: 'REVIEWED', label: 'Reviewed', description: 'Checked; no further action needed.' },
  {
    value: 'ESCALATED',
    label: 'Escalate',
    description: 'Marks it as serious. Banning the customer or merchant is a separate step on their user page.',
  },
]

export const COD_OBJECTION_OPTIONS = [
  { value: 'UPHELD', label: 'Uphold', description: 'Reverses the COD refusal and lifts a COD suspension it caused.' },
  { value: 'DISMISSED', label: 'Dismiss', description: 'The refusal stays on the customer’s record.' },
]

export const COMPLAINT_STATUS_OPTIONS = ENUMS.ComplaintStatus
export const OPEN_COMPLAINT_STATUSES = ['OPEN', 'UNDER_REVIEW']

// GET /api/admin/orders/cod-objections sort fields: createdAt, status.
export const COD_OBJECTION_SORT = 'createdAt,desc'

// ---------------------------------------------------------------------------
// Master data
// ---------------------------------------------------------------------------
export const MASTER_DATA_SIZE = 50
export const ACTIVE_FILTER_OPTIONS = [
  { value: '', label: 'Active and inactive' },
  { value: 'true', label: 'Active only' },
  { value: 'false', label: 'Inactive only' },
]
export const CATEGORY_SLUG_MAX = 80
export const TRACKING_PLACEHOLDER = '{trackingNumber}'

// ---------------------------------------------------------------------------
// Settings, holidays, credits (super admin)
// ---------------------------------------------------------------------------
// Groups by key prefix, in display order. Unknown prefixes go into "Other".
export const SETTING_GROUPS = [
  { prefix: 'timers', label: 'Timers' },
  { prefix: 'score', label: 'Scores' },
  { prefix: 'orders', label: 'Orders' },
  { prefix: 'complaints', label: 'Complaints' },
  { prefix: 'cod', label: 'Cash on delivery' },
  { prefix: 'merchant', label: 'Merchants' },
  { prefix: 'auth', label: 'Sign-in and sessions' },
  { prefix: 'fees', label: 'Fees' },
]
// Accepts only `false` (fees are recorded but never charged).
export const READ_ONLY_SETTINGS = ['fees.enforced']

export const HOLIDAY_TYPE_LABELS = { PUBLIC: 'Public holiday', POYA: 'Poya day' }
export const HOLIDAY_NAME_MAX = 100

export const LEDGER_TYPE_LABELS = { ORDER_FEE: 'Order fee', MONTHLY_FEE: 'Monthly fee', CREDIT: 'Credit' }
