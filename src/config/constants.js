// Small app-wide constants.

export const THEME_STORAGE_KEY = 'mp.theme' // also read by the inline script in index.html

// Paging (contract section 2): user lists cap at 50, admin lists at 100.
export const DEFAULT_PAGE_SIZE = 20
export const PAGE_SIZE_OPTIONS = [10, 20, 50]
export const ADMIN_PAGE_SIZE_OPTIONS = [20, 50, 100]

// Upload limits (contract section 6).
export const MAX_PRODUCT_IMAGES = 10
export const MAX_ATTACHMENTS = 10
export const MAX_REVIEW_ATTACHMENTS = 5
export const MAX_MERCHANT_DOCUMENTS = 10

export const TOAST_DURATION_MS = 4000
