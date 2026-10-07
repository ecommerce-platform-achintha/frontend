import { fieldErrorsToMap } from '@/api/client'

/**
 * Splits a normalised API error for a form:
 * - fieldErrors: { field: message } to show under inputs
 * - formMessage: one message for the top of the form (when nothing maps to a field)
 */
export function splitApiError(error) {
  const fieldErrors = fieldErrorsToMap(error)
  const hasFields = Object.keys(fieldErrors).length > 0
  return {
    fieldErrors,
    formMessage: hasFields ? '' : (error?.message ?? 'Something went wrong. Please try again.'),
  }
}

// Only allow same-site relative paths after login (prevents open redirects like //evil.com).
export function safeNextPath(next) {
  if (typeof next !== 'string' || !next.startsWith('/') || next.startsWith('//')) return null
  if (next.startsWith('/login') || next.startsWith('/register')) return null
  return next
}
