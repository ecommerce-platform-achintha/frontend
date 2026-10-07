// Admin (/api/admin/**) and super admin (/api/super-admin/**) endpoints.
// Note: merchant/customer/assistant actions take the USER public id (USR-...), not the store id.
import { api, unwrap } from './client'

// --- Users and merchants (7.1) ---
export const listUsers = (params) => unwrap(api.get('/api/admin/users', { params }))
export const getUser = (publicId) => unwrap(api.get(`/api/admin/users/${publicId}`))
export const assistantBan = (publicId, reason) => unwrap(api.post(`/api/admin/users/${publicId}/assistant-ban`, { reason }))
export const listPendingMerchants = (params) => unwrap(api.get('/api/admin/merchants/pending', { params }))
export const approveMerchant = (publicId, note) => unwrap(api.post(`/api/admin/merchants/${publicId}/approve`, note ? { note } : {}))
export const rejectMerchant = (publicId, reason) => unwrap(api.post(`/api/admin/merchants/${publicId}/reject`, { reason }))
export const banMerchant = (publicId, reason) => unwrap(api.post(`/api/admin/merchants/${publicId}/ban`, { reason }))
export const unbanMerchant = (publicId, reason) => unwrap(api.post(`/api/admin/merchants/${publicId}/unban`, { reason }))
export const banCustomer = (publicId, reason) => unwrap(api.post(`/api/admin/customers/${publicId}/ban`, { reason }))
export const unbanCustomer = (publicId, reason) => unwrap(api.post(`/api/admin/customers/${publicId}/unban`, { reason }))
export const getCustomerScore = (customerPublicId) => unwrap(api.get(`/api/admin/customers/${customerPublicId}/score`))

// --- Admins (super admin) ---
export const listAdmins = (params) => unwrap(api.get('/api/super-admin/admins', { params }))
export const createAdmin = (body) => unwrap(api.post('/api/super-admin/admins', body))
export const banAdmin = (publicId, reason) => unwrap(api.post(`/api/super-admin/admins/${publicId}/ban`, { reason }))
export const unbanAdmin = (publicId, reason) => unwrap(api.post(`/api/super-admin/admins/${publicId}/unban`, { reason }))

// --- Stores (7.2) ---
export const listStores = (params) => unwrap(api.get('/api/admin/stores', { params }))
export const getStore = (publicId) => unwrap(api.get(`/api/admin/stores/${publicId}`))
export const getStoreScore = (publicId) => unwrap(api.get(`/api/admin/stores/${publicId}/score`))
export const listStoreScoreEvents = (publicId, params) => unwrap(api.get(`/api/admin/stores/${publicId}/score-events`, { params }))
export const listStoreReviews = (publicId, params) => unwrap(api.get(`/api/admin/stores/${publicId}/reviews`, { params }))
export const hideStoreReview = (reviewPublicId, reason) => unwrap(api.post(`/api/admin/stores/reviews/${reviewPublicId}/hide`, { reason }))
export const unhideStoreReview = (reviewPublicId, reason) => unwrap(api.post(`/api/admin/stores/reviews/${reviewPublicId}/unhide`, { reason }))
export const listAtRiskMerchants = (params) => unwrap(api.get('/api/admin/merchants/at-risk', { params }))

// --- Banks (read: admin; write: super admin) ---
export const listBanks = (params) => unwrap(api.get('/api/admin/banks', { params }))
export const getBank = (code) => unwrap(api.get(`/api/admin/banks/${code}`))
export const createBank = (body) => unwrap(api.post('/api/admin/banks', body))
export const updateBank = (code, { name, active }) => unwrap(api.put(`/api/admin/banks/${code}`, { name, active }))
export const deleteBank = (code) => unwrap(api.delete(`/api/admin/banks/${code}`))

// --- Couriers (read: admin; write: super admin) ---
export const listCouriers = (params) => unwrap(api.get('/api/admin/couriers', { params }))
export const getCourier = (code) => unwrap(api.get(`/api/admin/couriers/${code}`))
export const createCourier = (body) => unwrap(api.post('/api/admin/couriers', body))
export const updateCourier = (code, body) => unwrap(api.put(`/api/admin/couriers/${code}`, body))
export const deleteCourier = (code) => unwrap(api.delete(`/api/admin/couriers/${code}`))

// --- Settings, holidays, credits (super admin) ---
export const listSettings = () => unwrap(api.get('/api/super-admin/settings')) // plain array
export const updateSetting = (key, { value, reason }) => unwrap(api.put(`/api/super-admin/settings/${key}`, { value, reason }))
export const listSettingHistory = (key, params) => unwrap(api.get(`/api/super-admin/settings/${key}/history`, { params }))
export const listHolidays = (params) => unwrap(api.get('/api/super-admin/holidays', { params }))
export const createHoliday = (body) => unwrap(api.post('/api/super-admin/holidays', body))
export const updateHoliday = (publicId, body) => unwrap(api.put(`/api/super-admin/holidays/${publicId}`, body))
export const deleteHoliday = (publicId) => unwrap(api.delete(`/api/super-admin/holidays/${publicId}`))
export const addMerchantCredit = (storePublicId, { amount, reason }) =>
  unwrap(api.post(`/api/super-admin/merchants/${storePublicId}/credits`, { amount, reason }))
export const getMerchantLedger = (storePublicId, params) => unwrap(api.get(`/api/super-admin/merchants/${storePublicId}/ledger`, { params }))

// --- Catalog (7.3) ---
export const listAdminCategories = () => unwrap(api.get('/api/admin/categories')) // plain array
export const getAdminCategory = (slug) => unwrap(api.get(`/api/admin/categories/${slug}`))
export const createCategory = (body) => unwrap(api.post('/api/admin/categories', body))
export const updateCategory = (slug, body) => unwrap(api.put(`/api/admin/categories/${slug}`, body))
export const deleteCategory = (slug) => unwrap(api.delete(`/api/admin/categories/${slug}`))
// `store` (STR-...) is REQUIRED
export const listAdminProducts = (params) => unwrap(api.get('/api/admin/products', { params }))
export const getAdminProduct = (publicId) => unwrap(api.get(`/api/admin/products/${publicId}`))
// `product` (ITM-...) is REQUIRED
export const listProductReviews = (params) => unwrap(api.get('/api/admin/reviews', { params }))
export const hideProductReview = (reviewPublicId, reason) => unwrap(api.post(`/api/admin/reviews/${reviewPublicId}/hide`, { reason }))
export const unhideProductReview = (reviewPublicId, reason) => unwrap(api.post(`/api/admin/reviews/${reviewPublicId}/unhide`, { reason }))

// --- Orders, complaints, flags, COD objections (7.4) ---
export const listOrders = (params) => unwrap(api.get('/api/admin/orders', { params }))
export const getOrder = (publicId) => unwrap(api.get(`/api/admin/orders/${publicId}`))
export const resolveOrder = (publicId, { action, reason }) => unwrap(api.post(`/api/admin/orders/${publicId}/resolve`, { action, reason }))
export const listCodObjections = (params) => unwrap(api.get('/api/admin/orders/cod-objections', { params }))
export const decideCodObjection = (orderPublicId, { decision, note }) =>
  unwrap(api.post(`/api/admin/orders/${orderPublicId}/cod-objection/decision`, { decision, note }))
export const listComplaints = (params) => unwrap(api.get('/api/admin/complaints', { params }))
export const getComplaint = (publicId) => unwrap(api.get(`/api/admin/complaints/${publicId}`))
export const decideComplaint = (publicId, { decision, notes }) => unwrap(api.post(`/api/admin/complaints/${publicId}/decision`, { decision, notes }))
export const listFlaggedReferences = (params) => unwrap(api.get('/api/admin/flagged-references', { params }))
export const getFlaggedReference = (publicId) => unwrap(api.get(`/api/admin/flagged-references/${publicId}`))
export const reviewFlaggedReference = (publicId, { action, note }) =>
  unwrap(api.post(`/api/admin/flagged-references/${publicId}/review`, { action, note }))
