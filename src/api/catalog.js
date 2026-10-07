// Catalog: categories, products, variants, stock, discounts, product reviews (contract 7.3).
// Admin catalog endpoints live in admin.js.
import { api, unwrap } from './client'

// Public (no token is sent)
export const listPublicCategories = () => unwrap(api.get('/api/public/categories')) // plain array
export const searchProducts = (params) => unwrap(api.get('/api/public/products', { params }))
export const getPublicProduct = (publicId) => unwrap(api.get(`/api/public/products/${publicId}`))
export const listPublicProductReviews = (publicId, params) => unwrap(api.get(`/api/public/products/${publicId}/reviews`, { params }))

// Customer
export const createProductReview = (productPublicId, body) => unwrap(api.post(`/api/customer/products/${productPublicId}/reviews`, body))

// Merchant products (read: PRODUCT_EDIT, STOCK_EDIT or DISCOUNT_MANAGE; write: PRODUCT_EDIT)
export const listMerchantProducts = (params) => unwrap(api.get('/api/merchant/products', { params }))
export const getMerchantProduct = (publicId) => unwrap(api.get(`/api/merchant/products/${publicId}`))
export const createProduct = (body) => unwrap(api.post('/api/merchant/products', body))
export const updateProduct = (publicId, body) => unwrap(api.put(`/api/merchant/products/${publicId}`, body))
export const setProductStatus = (publicId, status) => unwrap(api.post(`/api/merchant/products/${publicId}/status`, { status }))
export const archiveProduct = (publicId) => unwrap(api.delete(`/api/merchant/products/${publicId}`))

// Stock (STOCK_EDIT). Always send expectedVersion from the last read.
export const updateVariantStock = (variantPublicId, { mode, quantity, reason, expectedVersion }) =>
  unwrap(api.patch(`/api/merchant/variants/${variantPublicId}/stock`, { mode, quantity, reason, expectedVersion }))

// Discounts (DISCOUNT_MANAGE)
export const listDiscounts = (params) => unwrap(api.get('/api/merchant/discounts', { params }))
export const getDiscount = (publicId) => unwrap(api.get(`/api/merchant/discounts/${publicId}`))
export const createDiscount = (body) => unwrap(api.post('/api/merchant/discounts', body))
export const updateDiscount = (publicId, body) => unwrap(api.put(`/api/merchant/discounts/${publicId}`, body))
export const deleteDiscount = (publicId) => unwrap(api.delete(`/api/merchant/discounts/${publicId}`))

// Product reviews (REVIEW_REPLY)
export const listMerchantProductReviews = (params) => unwrap(api.get('/api/merchant/products/reviews', { params }))
export const replyToProductReview = (reviewPublicId, text) =>
  unwrap(api.post(`/api/merchant/products/reviews/${reviewPublicId}/reply`, { text }))
