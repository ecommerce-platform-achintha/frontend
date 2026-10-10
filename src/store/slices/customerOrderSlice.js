// One customer order at a time (order detail page) and the actions on it.
// After every action the order is replaced with the server's answer.
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import * as ordersApi from '@/api/orders'
import { logout, sessionExpired } from './authSlice'

// Codes that mean "someone else changed this order": reload it and tell the user.
export const ORDER_CHANGED_CODES = ['INVALID_ORDER_STATE', 'CONCURRENT_MODIFICATION']

export const fetchCustomerOrder = createAsyncThunk('customerOrder/fetch', async (publicId, { rejectWithValue }) => {
  try {
    return await ordersApi.getCustomerOrder(publicId)
  } catch (error) {
    return rejectWithValue(error)
  }
})

const looksLikeOrder = (data, publicId) => data && typeof data === 'object' && data.publicId === publicId && data.status

/**
 * Runs an action and returns the fresh order. The contract does not say what every action returns,
 * so when the answer is not the order itself we reload it.
 */
async function runAndReload(publicId, call, { dispatch, rejectWithValue }) {
  try {
    const data = await call()
    if (looksLikeOrder(data, publicId)) return data
    return await ordersApi.getCustomerOrder(publicId)
  } catch (error) {
    if (ORDER_CHANGED_CODES.includes(error?.code)) dispatch(fetchCustomerOrder(publicId))
    return rejectWithValue(error)
  }
}

const ACTIONS = {
  cancel: ordersApi.cancelOrder,
  confirm: ordersApi.confirmQuote,
  decline: ordersApi.declineQuote,
  received: ordersApi.markReceived,
}

// action: 'cancel' | 'confirm' | 'decline' | 'received'
export const runOrderAction = createAsyncThunk('customerOrder/action', ({ publicId, action }, api) =>
  runAndReload(publicId, () => ACTIONS[action](publicId), api),
)

// Needs the Idempotency-Key from useIdempotencyKey().
export const submitOrderPayment = createAsyncThunk('customerOrder/submitPayment', ({ publicId, body, idempotencyKey }, api) =>
  runAndReload(publicId, () => ordersApi.submitPayment(publicId, body, idempotencyKey), api),
)

export const submitCodObjection = createAsyncThunk('customerOrder/codObjection', ({ publicId, text }, api) =>
  runAndReload(publicId, () => ordersApi.fileCodObjection(publicId, text), api),
)

const initialState = { byId: {}, status: {}, error: {} }

function store(state, order) {
  if (!order?.publicId) return
  state.byId[order.publicId] = order
  state.status[order.publicId] = 'succeeded'
  delete state.error[order.publicId]
}

const customerOrderSlice = createSlice({
  name: 'customerOrder',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchCustomerOrder.pending, (state, action) => {
        // Keep showing the old copy while refreshing (window focus refetch).
        if (!state.byId[action.meta.arg]) state.status[action.meta.arg] = 'loading'
      })
      .addCase(fetchCustomerOrder.fulfilled, (state, action) => store(state, action.payload))
      .addCase(fetchCustomerOrder.rejected, (state, action) => {
        const id = action.meta.arg
        // A failed background refresh keeps the copy we have.
        if (state.byId[id] && action.payload?.status !== 404) return
        delete state.byId[id]
        state.status[id] = 'failed'
        state.error[id] = action.payload ?? { message: action.error.message }
      })
      .addCase(runOrderAction.fulfilled, (state, action) => store(state, action.payload))
      .addCase(submitOrderPayment.fulfilled, (state, action) => store(state, action.payload))
      .addCase(submitCodObjection.fulfilled, (state, action) => store(state, action.payload))
      .addCase(logout.fulfilled, () => initialState)
      .addCase(sessionExpired, () => initialState)
  },
})

export default customerOrderSlice.reducer

export const selectCustomerOrder = (state, publicId) => state.customerOrder.byId[publicId] ?? null
export const selectCustomerOrderStatus = (state, publicId) => state.customerOrder.status[publicId] ?? 'idle'
export const selectCustomerOrderError = (state, publicId) => state.customerOrder.error[publicId] ?? null
