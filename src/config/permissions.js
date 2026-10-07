// Roles, assistant permissions and who may open which feature (contract section 4).
// Components never hard-code these rules: they use usePermissions() and ROUTE_ACCESS.

export const ROLES = {
  CUSTOMER: 'ROLE_CUSTOMER',
  MERCHANT: 'ROLE_MERCHANT', // store owner
  ASSISTANT: 'ROLE_ASSISTANT', // merchant staff
  ADMIN: 'ROLE_ADMIN',
  SUPER_ADMIN: 'ROLE_SUPER_ADMIN',
}

export const ROLE_LABELS = {
  [ROLES.CUSTOMER]: 'Customer',
  [ROLES.MERCHANT]: 'Merchant',
  [ROLES.ASSISTANT]: 'Assistant',
  [ROLES.ADMIN]: 'Admin',
  [ROLES.SUPER_ADMIN]: 'Super admin',
}

// Account status as the user sees it (BAN_GRACE only ever appears on admin screens).
export const USER_STATUS = {
  ACTIVE: 'ACTIVE',
  PENDING_APPROVAL: 'PENDING_APPROVAL',
  REJECTED: 'REJECTED',
  BANNED: 'BANNED',
}

export const PERMS = {
  ORDER_VIEW: 'ORDER_VIEW',
  ORDER_QUOTE: 'ORDER_QUOTE',
  PAYMENT_VERIFY: 'PAYMENT_VERIFY',
  ORDER_SHIP: 'ORDER_SHIP',
  PRODUCT_EDIT: 'PRODUCT_EDIT',
  STOCK_EDIT: 'STOCK_EDIT',
  DISCOUNT_MANAGE: 'DISCOUNT_MANAGE',
  CUSTOMER_BLOCK: 'CUSTOMER_BLOCK',
  REVIEW_REPLY: 'REVIEW_REPLY',
}

export const ASSISTANT_PERMISSIONS = Object.values(PERMS)

export const PERM_LABELS = {
  ORDER_VIEW: 'View orders and complaints',
  ORDER_QUOTE: 'Quote, reject orders, answer complaints',
  PAYMENT_VERIFY: 'Verify bank transfers',
  ORDER_SHIP: 'Ship orders',
  PRODUCT_EDIT: 'Create and edit products',
  STOCK_EDIT: 'Edit stock',
  DISCOUNT_MANAGE: 'Manage discounts',
  CUSTOMER_BLOCK: 'Block customers',
  REVIEW_REPLY: 'Reply to reviews',
}

// Role groups
export const MERCHANT_SIDE = [ROLES.MERCHANT, ROLES.ASSISTANT]
export const OWNER_ONLY = [ROLES.MERCHANT]
export const ADMIN_SIDE = [ROLES.ADMIN, ROLES.SUPER_ADMIN]
export const SUPER_ADMIN_ONLY = [ROLES.SUPER_ADMIN]
export const CUSTOMER_ONLY = [ROLES.CUSTOMER]

// Reading products is allowed with any of these.
export const PRODUCT_READ_PERMS = [PERMS.PRODUCT_EDIT, PERMS.STOCK_EDIT, PERMS.DISCOUNT_MANAGE]

/**
 * Route/feature table. Each entry: { roles, perms?, anyPerms? }.
 * - perms: ALL of these are needed; anyPerms: at least ONE is needed.
 * - The merchant (owner) role holds every permission implicitly.
 */
export const ROUTE_ACCESS = {
  // Customer
  customer: { roles: CUSTOMER_ONLY },

  // Merchant side
  merchantDashboard: { roles: OWNER_ONLY },
  merchantApplication: { roles: OWNER_ONLY },
  merchantOrders: { roles: MERCHANT_SIDE, perms: [PERMS.ORDER_VIEW] },
  merchantComplaints: { roles: MERCHANT_SIDE, perms: [PERMS.ORDER_VIEW] },
  merchantProducts: { roles: MERCHANT_SIDE, anyPerms: PRODUCT_READ_PERMS },
  merchantProductCreate: { roles: MERCHANT_SIDE, perms: [PERMS.PRODUCT_EDIT] },
  merchantDiscounts: { roles: MERCHANT_SIDE, perms: [PERMS.DISCOUNT_MANAGE] },
  merchantReviews: { roles: MERCHANT_SIDE, perms: [PERMS.REVIEW_REPLY] },
  merchantCustomerBlocks: { roles: MERCHANT_SIDE, perms: [PERMS.CUSTOMER_BLOCK] },
  merchantStore: { roles: OWNER_ONLY },
  merchantBankAccounts: { roles: OWNER_ONLY },
  merchantShipping: { roles: OWNER_ONLY }, // couriers and shipping templates
  merchantAssistants: { roles: OWNER_ONLY },
  merchantMetrics: { roles: OWNER_ONLY },

  // Admin side
  admin: { roles: ADMIN_SIDE },
  superAdmin: { roles: SUPER_ADMIN_ONLY },

  // Any signed-in user
  signedIn: { roles: Object.values(ROLES) },
}

// Merchant-side features an action needs (used by PermissionButton and detail pages later).
export const ACTION_ACCESS = {
  quoteOrder: [PERMS.ORDER_QUOTE],
  rejectOrder: [PERMS.ORDER_QUOTE],
  respondToComplaint: [PERMS.ORDER_QUOTE],
  verifyPayment: [PERMS.PAYMENT_VERIFY],
  shipOrder: [PERMS.ORDER_SHIP],
  markDeliveryFailed: [PERMS.ORDER_SHIP],
  editProduct: [PERMS.PRODUCT_EDIT],
  editStock: [PERMS.STOCK_EDIT],
  manageDiscounts: [PERMS.DISCOUNT_MANAGE],
  blockCustomer: [PERMS.CUSTOMER_BLOCK],
  replyToReview: [PERMS.REVIEW_REPLY],
}

// --- Pure helpers (also used by the usePermissions hook) ---

export function userHasPerm({ role, perms }, perm) {
  if (role === ROLES.MERCHANT) return true
  return role === ROLES.ASSISTANT && Array.isArray(perms) && perms.includes(perm)
}

/**
 * Checks a user ({ role, perms }) against a rule ({ roles, perms, anyPerms }).
 */
export function canAccess(user, rule = {}) {
  if (!user?.role) return false
  if (rule.roles && !rule.roles.includes(user.role)) return false
  if (rule.perms?.length && !rule.perms.every((p) => userHasPerm(user, p))) return false
  if (rule.anyPerms?.length && !rule.anyPerms.some((p) => userHasPerm(user, p))) return false
  return true
}

// Assistants land on the first of these they can open (in this order).
const ASSISTANT_LANDING_ORDER = [
  ['/merchant/orders', ROUTE_ACCESS.merchantOrders],
  ['/merchant/products', ROUTE_ACCESS.merchantProducts],
  ['/merchant/discounts', ROUTE_ACCESS.merchantDiscounts],
  ['/merchant/reviews', ROUTE_ACCESS.merchantReviews],
  ['/merchant/customer-blocks', ROUTE_ACCESS.merchantCustomerBlocks],
]

/**
 * Where to go after login. `user` = { role, status, perms }.
 */
export function landingPathFor(user) {
  switch (user?.role) {
    case ROLES.CUSTOMER:
      return '/'
    case ROLES.MERCHANT:
      return user.status === USER_STATUS.REJECTED ? '/merchant/application' : '/merchant'
    case ROLES.ASSISTANT: {
      const match = ASSISTANT_LANDING_ORDER.find(([, rule]) => canAccess(user, rule))
      // An assistant whose permissions open no page (e.g. only ORDER_SHIP) sees the 403 page.
      return match ? match[0] : '/403'
    }
    case ROLES.ADMIN:
    case ROLES.SUPER_ADMIN:
      return '/admin'
    default:
      return '/'
  }
}
