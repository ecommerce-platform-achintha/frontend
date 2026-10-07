// Accounts: registration, own profile, addresses, merchant application, assistants (contract 7.1).
import { api, unwrap } from './client'

// Registration returns a profile (201), not tokens.
export const registerCustomer = (body) => unwrap(api.post('/api/users/register/customer', body))
export const registerMerchant = (body) => unwrap(api.post('/api/users/register/merchant', body))

// Own profile
export const getMe = () => unwrap(api.get('/api/users/me'))
export const updateMe = ({ firstName, lastName, phone }) => unwrap(api.put('/api/users/me', { firstName, lastName, phone }))

// Addresses (paged; sort createdAt, updatedAt, city)
export const listAddresses = (params) => unwrap(api.get('/api/users/me/addresses', { params }))
export const getAddress = (publicId) => unwrap(api.get(`/api/users/me/addresses/${publicId}`))
export const createAddress = (body) => unwrap(api.post('/api/users/me/addresses', body))
export const updateAddress = (publicId, body) => unwrap(api.put(`/api/users/me/addresses/${publicId}`, body))
export const deleteAddress = (publicId) => unwrap(api.delete(`/api/users/me/addresses/${publicId}`))

// Merchant application (owner)
export const getMerchantApplication = () => unwrap(api.get('/api/merchant/application'))
export const resubmitMerchantApplication = ({ businessName, documentKeys }) =>
  unwrap(api.post('/api/merchant/application/resubmit', { businessName, documentKeys }))

// Assistants (owner; paged list, sort createdAt, lastName, email, assistantStatus)
export const listAssistants = (params) => unwrap(api.get('/api/merchant/owner/assistants', { params }))
export const getAssistant = (publicId) => unwrap(api.get(`/api/merchant/owner/assistants/${publicId}`))
export const createAssistant = (body) => unwrap(api.post('/api/merchant/owner/assistants', body))
export const updateAssistantPermissions = (publicId, permissions) =>
  unwrap(api.put(`/api/merchant/owner/assistants/${publicId}/permissions`, { permissions }))
export const banAssistant = (publicId, reason) => unwrap(api.post(`/api/merchant/owner/assistants/${publicId}/ban`, { reason }))
export const unbanAssistant = (publicId, reason) => unwrap(api.post(`/api/merchant/owner/assistants/${publicId}/unban`, { reason }))
export const removeAssistant = (publicId, reason) => unwrap(api.post(`/api/merchant/owner/assistants/${publicId}/remove`, { reason }))
