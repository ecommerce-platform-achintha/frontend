import { configureStore } from '@reduxjs/toolkit'
import authReducer from '@/store/slices/authSlice'
import uiReducer from '@/store/slices/uiSlice'
import cartReducer from '@/store/slices/cartSlice'
import categoriesReducer from '@/store/slices/categoriesSlice'
import publicStoresReducer from '@/store/slices/publicStoresSlice'
import productSearchReducer from '@/store/slices/productSearchSlice'
import publicStoreListReducer from '@/store/slices/publicStoreListSlice'
import productReviewsReducer from '@/store/slices/productReviewsSlice'
import storeReviewsReducer from '@/store/slices/storeReviewsSlice'
import customerOrdersReducer from '@/store/slices/customerOrdersSlice'
import customerOrderReducer from '@/store/slices/customerOrderSlice'
import customerComplaintsReducer from '@/store/slices/customerComplaintsSlice'
import addressesReducer from '@/store/slices/addressesSlice'
import { MERCHANT_LIST_REDUCERS } from '@/store/slices/merchantLists'

// One reducer per resource. Paged list slices from createPagedResource are added here
// with the same key as their `name`.
export const store = configureStore({
  reducer: {
    auth: authReducer,
    ui: uiReducer,
    cart: cartReducer,
    categories: categoriesReducer,
    publicStores: publicStoresReducer,
    productSearch: productSearchReducer,
    publicStoreList: publicStoreListReducer,
    productReviews: productReviewsReducer,
    storeReviews: storeReviewsReducer,
    customerOrders: customerOrdersReducer,
    customerOrder: customerOrderReducer,
    customerComplaints: customerComplaintsReducer,
    addresses: addressesReducer,
    // Seller-center paged lists (merchantOrders, merchantProducts, ...)
    ...MERCHANT_LIST_REDUCERS,
  },
})
