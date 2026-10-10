// Address form state, checks (contract section 6) and request body.
import { DEFAULT_COUNTRY } from '@/config/districts'
import { compactErrors, LIMITS, normalizePhone, REGEX, validateName, validatePhone } from '@/utils/validators'

export const EMPTY_ADDRESS = {
  recipientName: '',
  phone: '',
  line1: '',
  line2: '',
  city: '',
  district: '',
  postalCode: '',
  country: DEFAULT_COUNTRY,
}

export function addressToForm(address) {
  if (!address) return EMPTY_ADDRESS
  return Object.fromEntries(Object.keys(EMPTY_ADDRESS).map((key) => [key, address[key] ?? EMPTY_ADDRESS[key]]))
}

export function validateAddress(values) {
  return compactErrors({
    recipientName: validateName(values.recipientName, 'Recipient name', LIMITS.recipientName),
    phone: validatePhone(values.phone),
    line1: validateName(values.line1, 'Address line 1', LIMITS.addressLine),
    line2: values.line2.trim().length > LIMITS.addressLine ? `Keep it under ${LIMITS.addressLine} characters.` : '',
    city: validateName(values.city, 'City'),
    district: values.district ? '' : 'Choose a district.',
    postalCode: !values.postalCode.trim()
      ? 'Postal code is required.'
      : REGEX.postalCode.test(values.postalCode.trim())
        ? ''
        : 'Use letters, digits, spaces or dashes (up to 20).',
  })
}

// POST/PUT /api/users/me/addresses body. PUT replaces the whole address.
export function toAddressBody(values) {
  return {
    recipientName: values.recipientName.trim(),
    phone: normalizePhone(values.phone),
    line1: values.line1.trim(),
    line2: values.line2.trim() || undefined,
    city: values.city.trim(),
    district: values.district,
    postalCode: values.postalCode.trim(),
    country: values.country.trim() || undefined, // the server defaults to Sri Lanka
  }
}
