// Customer cart. For now only loads it (header badge); the cart prompt adds the mutations.
// The server re-prices the cart on every read: never compute totals here.
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import * as ordersApi from '@/api/orders'
import { logout, sessionExpired } from './authSlice'

export const fetchCart = createAsyncThunk('cart/fetch', async (_, { rejectWithValue }) => {
  try {
    return await ordersApi.getCart()
  } catch (error) {
    return rejectWithValue(error)
  }
})

const initialState = { data: null, status: 'idle', error: null }

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    // Every cart mutation returns the full cart; store it with this.
    cartReceived(state, action) {
      state.data = action.payload
      state.status = 'succeeded'
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCart.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(fetchCart.fulfilled, (state, action) => {
        state.status = 'succeeded'
        state.data = action.payload
      })
      .addCase(fetchCart.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload ?? null
      })
      .addCase(logout.fulfilled, () => initialState)
      .addCase(sessionExpired, () => initialState)
  },
})

export const { cartReceived } = cartSlice.actions
export default cartSlice.reducer

export const selectCart = (state) => state.cart.data
export const selectCartStatus = (state) => state.cart.status
export const selectCartLineCount = (state) => state.cart.data?.lineCount ?? 0
