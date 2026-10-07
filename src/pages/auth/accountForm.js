// Shared state and checks for the customer and merchant sign-up forms.
import {
  compactErrors,
  LIMITS,
  normalizePhone,
  validateEmail,
  validateName,
  validateNic,
  validatePassword,
  validatePhone,
} from '@/utils/validators'

export const EMPTY_ACCOUNT = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  nic: '',
  password: '',
  confirmPassword: '', // client-only
}

// Field names the server may report for step 1 (used to jump back from step 2).
export const ACCOUNT_FIELDS = ['firstName', 'lastName', 'email', 'phone', 'nic', 'password']

export function validateAccount(values) {
  return compactErrors({
    firstName: validateName(values.firstName, 'First name', LIMITS.name),
    lastName: validateName(values.lastName, 'Last name', LIMITS.name),
    email: validateEmail(values.email),
    phone: validatePhone(values.phone),
    nic: validateNic(values.nic),
    password: validatePassword(values.password),
    confirmPassword: values.confirmPassword === values.password ? '' : 'Passwords do not match.',
  })
}

// Request body for POST /api/users/register/* (contract 7.1).
export function toAccountBody(values) {
  return {
    email: values.email.trim(),
    password: values.password, // never trimmed: spaces are part of the password check
    firstName: values.firstName.trim(),
    lastName: values.lastName.trim(),
    nic: values.nic.trim().toUpperCase(),
    phone: normalizePhone(values.phone),
  }
}
