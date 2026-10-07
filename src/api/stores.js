// Stores: public stores, store reviews, merchant store setup (contract 7.2).
// Admin and super-admin store endpoints live in admin.js.
import { api, unwrap } from './client'

// Public (no token is sent)
export const listPublicStores = (params) => unwrap(api.get('/api/public/stores', { params }))
export const getPublicStore = (publicId) => unwrap(api.get(`/api/public/stores/${publicId}`))
export const listPublicStoreReviews = (publicId, params) => unwrap(api.get(`/api/public/stores/${publicId}/reviews`, { params }))

// Customer
export const createStoreReview = (storePublicId, body) => unwrap(api.post(`/api/customer/stores/${storePublicId}/reviews`, body))

// Merchant store profile (GET is a 404 until the first save: treat as "set up your store")
export const getMyStore = () => unwrap(api.get('/api/merchant/store'))
export const updateMyStore = (body) => unwrap(api.put('/api/merchant/store', body))
export const setCodEnabled = (enabled) => unwrap(api.put('/api/merchant/store/cod', { enabled }))

// Bank accounts (owner)
export const listBankAccounts = (params) => unwrap(api.get('/api/merchant/owner/bank-accounts', { params }))
export const listAvailableBanks = () => unwrap(api.get('/api/merchant/owner/bank-accounts/banks')) // plain array
export const getBankAccount = (publicId) => unwrap(api.get(`/api/merchant/owner/bank-accounts/${publicId}`))
export const createBankAccount = (body) => unwrap(api.post('/api/merchant/owner/bank-accounts', body))
export const updateBankAccount = (publicId, body) => unwrap(api.put(`/api/merchant/owner/bank-accounts/${publicId}`, body))
export const deleteBankAccount = (publicId) => unwrap(api.delete(`/api/merchant/owner/bank-accounts/${publicId}`))

// Couriers (owner; plain arrays)
export const listMyCouriers = () => unwrap(api.get('/api/merchant/owner/couriers'))
export const listAvailableCouriers = () => unwrap(api.get('/api/merchant/owner/couriers/available'))
export const setMyCouriers = (courierCodes) => unwrap(api.put('/api/merchant/owner/couriers', { courierCodes }))

// Shipping templates (owner; estimates only)
export const listShippingTemplates = (params) => unwrap(api.get('/api/merchant/owner/shipping-templates', { params }))
export const getShippingTemplate = (publicId) => unwrap(api.get(`/api/merchant/owner/shipping-templates/${publicId}`))
export const createShippingTemplate = (body) => unwrap(api.post('/api/merchant/owner/shipping-templates', body))
export const updateShippingTemplate = (publicId, body) => unwrap(api.put(`/api/merchant/owner/shipping-templates/${publicId}`, body))
export const deleteShippingTemplate = (publicId) => unwrap(api.delete(`/api/merchant/owner/shipping-templates/${publicId}`))

// Metrics (owner)
export const getMyMetrics = () => unwrap(api.get('/api/merchant/owner/metrics'))

// Store reviews (REVIEW_REPLY)
export const listMerchantStoreReviews = (params) => unwrap(api.get('/api/merchant/reviews', { params }))
export const replyToStoreReview = (publicId, text) => unwrap(api.post(`/api/merchant/reviews/${publicId}/reply`, { text }))
