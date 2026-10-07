import { configureStore } from '@reduxjs/toolkit'
import authReducer from '@/store/slices/authSlice'
import uiReducer from '@/store/slices/uiSlice'
import cartReducer from '@/store/slices/cartSlice'
import categoriesReducer from '@/store/slices/categoriesSlice'

// One reducer per resource. Paged list slices from createPagedResource are added here
// with the same key as their `name`.
export const store = configureStore({
  reducer: {
    auth: authReducer,
    ui: uiReducer,
    cart: cartReducer,
    categories: categoriesReducer,
  },
})
