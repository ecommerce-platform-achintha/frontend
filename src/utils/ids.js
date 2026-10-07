// Public ids look like ORD-2610-7K2M9Q (contract section 2). UUIDs are never exposed.
export const PUBLIC_ID_REGEX = /^[A-Z]{3}-\d{4}-[0-9A-HJKMNP-TV-Z]{6}$/

export const ID_PREFIX = {
  USER: 'USR',
  STORE: 'STR',
  PRODUCT: 'ITM',
  VARIANT: 'VAR',
  ORDER: 'ORD',
  CHECKOUT: 'CHK',
  PAYMENT: 'PAY',
  COMPLAINT: 'CMP',
  REVIEW: 'REV',
  FLAG: 'FLG',
}

// isPublicId('ORD-2610-7K2M9Q') -> true; isPublicId('ORD-2610-7K2M9Q', 'USR') -> false
export function isPublicId(value, prefix) {
  if (typeof value !== 'string' || !PUBLIC_ID_REGEX.test(value)) return false
  return prefix ? value.startsWith(`${prefix}-`) : true
}

// Users often paste ids in lower case or with spaces.
export function normalizePublicId(value) {
  return String(value ?? '').trim().toUpperCase()
}
