// Client-side checks that mirror the backend (contract section 6).
// The backend is still the authority: always show its fieldErrors too.
// Each validator returns an error message string, or '' when the value is fine.

export const LIMITS = {
  email: 254,
  name: 100,
  businessName: 150,
  reason: 500,
  longText: 2000, // reviews, replies, objections
  complaintText: 4000,
  storeNameMin: 3,
  storeNameMax: 100,
  passwordMin: 12,
  passwordMax: 128,
  recipientName: 150,
  addressLine: 200,
}

export const REGEX = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phone: /^\+?[1-9]\d{7,14}$/,
  nic: /^(\d{9}[VvXx]|\d{12})$/,
  code: /^[A-Z][A-Z0-9_]{1,19}$/, // bank and courier codes
  categorySlug: /^[a-z0-9]+(-[a-z0-9]+)*$/,
  sku: /^[A-Za-z0-9][A-Za-z0-9._/-]{0,63}$/,
  postalCode: /^[A-Za-z0-9 -]{1,20}$/,
  paymentReference: /^\s*[A-Za-z0-9][A-Za-z0-9 /._-]{0,59}\s*$/,
  depositorAccount: /^[\d\s-]+$/,
  money: /^\d+(\.\d{1,2})?$/,
}

export function validateRequired(value, label = 'This field') {
  return String(value ?? '').trim() ? '' : `${label} is required.`
}

export function validateEmail(value) {
  const v = String(value ?? '').trim()
  if (!v) return 'Email is required.'
  if (v.length > LIMITS.email) return `Email must be at most ${LIMITS.email} characters.`
  return REGEX.email.test(v) ? '' : 'Enter a valid email address.'
}

export function validateName(value, label = 'Name', max = LIMITS.name) {
  const v = String(value ?? '').trim()
  if (!v) return `${label} is required.`
  return v.length > max ? `${label} must be at most ${max} characters.` : ''
}

// Phone numbers are sent without spaces: "+94 77 123 4567" -> "+94771234567".
export function normalizePhone(value) {
  return String(value ?? '').replace(/\s+/g, '')
}

export function validatePhone(value, { required = true } = {}) {
  const v = normalizePhone(value)
  if (!v) return required ? 'Phone number is required.' : ''
  return REGEX.phone.test(v) ? '' : 'Use international format, for example +94771234567.'
}

export function validateNic(value) {
  const v = String(value ?? '').trim()
  if (!v) return 'NIC is required.'
  return REGEX.nic.test(v) ? '' : 'Enter 9 digits followed by V or X, or 12 digits.'
}

export function validateReason(value, { required = true, max = LIMITS.reason } = {}) {
  const v = String(value ?? '').trim()
  if (!v) return required ? 'Please give a reason.' : ''
  return v.length > max ? `Keep it under ${max} characters.` : ''
}

// Positive amount with at most 2 decimals.
export function validateMoney(value, { required = true, allowZero = false } = {}) {
  const v = String(value ?? '').trim()
  if (!v) return required ? 'Amount is required.' : ''
  if (!REGEX.money.test(v)) return 'Use a number with at most 2 decimals.'
  const n = Number(v)
  if (allowZero ? n < 0 : n <= 0) return allowZero ? 'Amount cannot be negative.' : 'Amount must be more than 0.'
  return ''
}

// A short list of very common passwords. The backend has the full list; this only gives early feedback.
const COMMON_PASSWORDS = new Set([
  '123456789012', '1234567890123', 'password1234', 'password12345', 'passwordpassword',
  'qwertyuiopas', 'qwerty123456', '111111111111', '000000000000', 'abcdefghijkl',
  'iloveyou1234', 'administrator', 'welcome12345', 'letmein12345', 'changeme1234',
  'abc123abc123', 'aaaaaaaaaaaa', 'qwertyqwerty', 'asdfghjklasd', 'football1234',
])

/**
 * Checks the password policy rule by rule (for the live checklist).
 * @returns {{ ok: boolean, rules: { id: string, label: string, ok: boolean }[] }}
 */
export function checkPassword(password) {
  const value = String(password ?? '')
  const rules = [
    {
      id: 'length',
      label: `${LIMITS.passwordMin} to ${LIMITS.passwordMax} characters`,
      ok: value.length >= LIMITS.passwordMin && value.length <= LIMITS.passwordMax,
    },
    {
      id: 'whitespace',
      label: 'No space at the start or end',
      ok: value.length > 0 && value === value.trim(),
    },
    {
      id: 'distinct',
      label: 'At least 4 different characters',
      ok: new Set(value).size >= 4,
    },
    {
      id: 'common',
      label: 'Not a common password',
      ok: value.length > 0 && !COMMON_PASSWORDS.has(value.toLowerCase()),
    },
  ]
  return { ok: rules.every((r) => r.ok), rules }
}

export function validatePassword(value) {
  if (!value) return 'Password is required.'
  return checkPassword(value).ok ? '' : 'Password does not meet the rules below.'
}

// Removes empty messages: { email: '', phone: 'Bad' } -> { phone: 'Bad' }
export function compactErrors(errors) {
  return Object.fromEntries(Object.entries(errors).filter(([, message]) => Boolean(message)))
}
