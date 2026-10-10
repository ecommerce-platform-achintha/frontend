// Sort and filter options for the public catalog (contract 7.2 and 7.3).

// GET /api/public/products uses its own sort values (not field,dir).
export const PRODUCT_SORT_OPTIONS = [
  { value: 'relevance', label: 'Relevance' },
  { value: 'price,asc', label: 'Price: low to high' },
  { value: 'price,desc', label: 'Price: high to low' },
  { value: 'newest', label: 'Newest' },
  { value: 'rating', label: 'Top rated' },
]

export const PRODUCT_PAGE_SIZES = [12, 24, 48] // the API caps at 50

export const MIN_RATING_OPTIONS = [
  { value: '', label: 'Any rating' },
  { value: '4', label: '4 stars and up' },
  { value: '3', label: '3 stars and up' },
  { value: '2', label: '2 stars and up' },
  { value: '1', label: '1 star and up' },
]

// GET /api/public/stores: sort fields name, rating, newest (default name,asc).
// "newest" is a field like the others: plain "newest" (= asc) lists the OLDEST first,
// so newest-first needs "newest,desc" (checked against the gateway).
export const STORE_SORT_OPTIONS = [
  { value: 'name,asc', label: 'Name (A to Z)' },
  { value: 'rating,desc', label: 'Top rated' },
  { value: 'newest,desc', label: 'Newest' },
]

// Store and product review lists: sort createdAt, rating.
export const REVIEW_SORT_OPTIONS = [
  { value: 'createdAt,desc', label: 'Newest' },
  { value: 'rating,desc', label: 'Highest rating' },
  { value: 'rating,asc', label: 'Lowest rating' },
]

export const REVIEW_TEXT_MAX = 2000
