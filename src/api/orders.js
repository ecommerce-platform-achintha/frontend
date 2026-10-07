// Orders: cart, checkout, customer orders, complaints, merchant order handling (contract 7.4).
// Admin order endpoints live in admin.js.
import { api, unwrap, withIdempotencyKey } from './client'

// Cart (customer; every call returns the re-priced cart)
export const getCart = () => unwrap(api.get('/api/customer/cart'))
export const addCartItem = ({ variantPublicId, quantity }) => unwrap(api.post('/api/customer/cart/items', { variantPublicId, quantity }))
export const updateCartItem = (cartItemId, quantity) => unwrap(api.put(`/api/customer/cart/items/${cartItemId}`, { quantity }))
export const removeCartItem = (cartItemId) => unwrap(api.delete(`/api/customer/cart/items/${cartItemId}`))
export const clearCart = () => unwrap(api.delete('/api/customer/cart'))

/**
 * Checkout. Needs an Idempotency-Key (one per user intent).
 * A 422 carries the same body as a 201 (no store placed): read `error.data` in the caller.
 */
export const checkout = (body, idempotencyKey) => unwrap(api.post('/api/customer/checkout', body, withIdempotencyKey(idempotencyKey)))

// Customer orders (status is a list: status=A&status=B)
export const listCustomerOrders = (params) => unwrap(api.get('/api/customer/orders', { params }))
export const getCustomerOrder = (publicId) => unwrap(api.get(`/api/customer/orders/${publicId}`))
export const cancelOrder = (publicId) => unwrap(api.post(`/api/customer/orders/${publicId}/cancel`))
export const confirmQuote = (publicId) => unwrap(api.post(`/api/customer/orders/${publicId}/confirm`))
export const declineQuote = (publicId) => unwrap(api.post(`/api/customer/orders/${publicId}/decline`))
// FULL account numbers: never cache in Redux or log.
export const getOrderBankAccounts = (publicId) => unwrap(api.get(`/api/customer/orders/${publicId}/bank-accounts`))
export const submitPayment = (publicId, body, idempotencyKey) =>
  unwrap(api.post(`/api/customer/orders/${publicId}/payments`, body, withIdempotencyKey(idempotencyKey)))
export const markReceived = (publicId) => unwrap(api.post(`/api/customer/orders/${publicId}/received`))
export const fileCodObjection = (publicId, text) => unwrap(api.post(`/api/customer/orders/${publicId}/cod-objection`, { text }))

// Customer complaints
export const listCustomerComplaints = (params) => unwrap(api.get('/api/customer/complaints', { params }))
export const getCustomerComplaint = (publicId) => unwrap(api.get(`/api/customer/complaints/${publicId}`))
export const createComplaint = (body) => unwrap(api.post('/api/customer/complaints', body))

// Merchant orders (ORDER_VIEW to read)
export const listMerchantOrders = (params) => unwrap(api.get('/api/merchant/orders', { params }))
export const getMerchantOrder = (publicId) => unwrap(api.get(`/api/merchant/orders/${publicId}`))
export const rejectOrder = (publicId, { reasonCode, note }) => unwrap(api.post(`/api/merchant/orders/${publicId}/reject`, { reasonCode, note }))
export const quoteOrder = (publicId, body) => unwrap(api.post(`/api/merchant/orders/${publicId}/quote`, body))
export const verifyPayment = (publicId) => unwrap(api.post(`/api/merchant/orders/${publicId}/payment/verify`))
export const rejectPayment = (publicId, reason) => unwrap(api.post(`/api/merchant/orders/${publicId}/payment/reject`, { reason }))
export const shipOrder = (publicId, { courierCode, trackingNumber }) =>
  unwrap(api.post(`/api/merchant/orders/${publicId}/ship`, { courierCode, trackingNumber }))
export const markDeliveryFailed = (publicId, { type, note }) => unwrap(api.post(`/api/merchant/orders/${publicId}/delivery-failed`, { type, note }))

// Merchant complaints
export const listMerchantComplaints = (params) => unwrap(api.get('/api/merchant/orders/complaints', { params }))
export const getMerchantComplaint = (publicId) => unwrap(api.get(`/api/merchant/orders/complaints/${publicId}`))
export const respondToComplaint = (publicId, response) => unwrap(api.post(`/api/merchant/orders/complaints/${publicId}/response`, { response }))

// Customer blocks (CUSTOMER_BLOCK)
export const listCustomerBlocks = (params) => unwrap(api.get('/api/merchant/customer-blocks', { params }))
export const blockCustomer = ({ customerPublicId, reason }) => unwrap(api.post('/api/merchant/customer-blocks', { customerPublicId, reason }))
export const unblockCustomer = (customerPublicId, reason) =>
  unwrap(api.delete(`/api/merchant/customer-blocks/${customerPublicId}`, { params: { reason } }))
