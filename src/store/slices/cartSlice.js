// Customer cart. Every cart call returns the whole re-priced cart, which replaces ours.
// Never compute what the server charges here; the selected-items total is a display sum only.
import { createAsyncThunk, createSelector, createSlice } from '@reduxjs/toolkit'
import * as ordersApi from '@/api/orders'
import { logout, sessionExpired } from './authSlice'

// Wraps an API call that returns the cart.
const cartThunk = (type, call) =>
  createAsyncThunk(type, async (arg, { rejectWithValue }) => {
    try {
      return await call(arg)
    } catch (error) {
      return rejectWithValue(error)
    }
  })

export const fetchCart = cartThunk('cart/fetch', () => ordersApi.getCart())
export const addToCart = cartThunk('cart/add', ({ variantPublicId, quantity }) => ordersApi.addCartItem({ variantPublicId, quantity }))
export const updateCartLine = cartThunk('cart/updateLine', ({ cartItemId, quantity }) => ordersApi.updateCartItem(cartItemId, quantity))
export const removeCartLine = cartThunk('cart/removeLine', ({ cartItemId }) => ordersApi.removeCartItem(cartItemId))
export const clearCart = cartThunk('cart/clear', () => ordersApi.clearCart())

const initialState = {
  data: null, // { stores: [{ storePublicId, storeName, lines, subtotal }], lineCount, itemsTotal }
  status: 'idle',
  error: null,
  // cartItemPublicIds the customer ticked for checkout (kept here, not in the URL).
  selectedIds: [],
  // True until the customer touches the checkboxes: new available lines are then auto-selected.
  autoSelect: true,
}

// A line can go to checkout only when it is available and has no issue.
export const isLineSelectable = (line) => Boolean(line?.available) && !line?.issue

function allLines(cart) {
  return (cart?.stores ?? []).flatMap((store) => store.lines ?? [])
}

// Keeps the selection valid after the cart changed (removed or unavailable lines drop out).
function receiveCart(state, cart) {
  state.data = cart
  state.status = 'succeeded'
  state.error = null
  const selectable = allLines(cart).filter(isLineSelectable).map((l) => l.cartItemPublicId)
  state.selectedIds = state.autoSelect ? selectable : state.selectedIds.filter((id) => selectable.includes(id))
}

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    cartReceived(state, action) {
      receiveCart(state, action.payload)
    },
    // ids: array of cartItemPublicIds; selected: true/false
    selectionChanged(state, action) {
      const { ids, selected } = action.payload
      const selectable = allLines(state.data).filter(isLineSelectable).map((l) => l.cartItemPublicId)
      const valid = ids.filter((id) => selectable.includes(id))
      state.autoSelect = false
      state.selectedIds = selected
        ? [...new Set([...state.selectedIds, ...valid])]
        : state.selectedIds.filter((id) => !valid.includes(id))
    },
    selectionReset(state) {
      state.selectedIds = []
      state.autoSelect = true
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCart.pending, (state) => {
        state.status = state.data ? state.status : 'loading'
        state.error = null
      })
      .addCase(fetchCart.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload ?? null
      })
      .addCase(logout.fulfilled, () => initialState)
      .addCase(sessionExpired, () => initialState)
      .addMatcher(
        (action) =>
          [fetchCart, addToCart, updateCartLine, removeCartLine, clearCart].some((thunk) => thunk.fulfilled.match(action)),
        (state, action) => receiveCart(state, action.payload),
      )
  },
})

export const { cartReceived, selectionChanged, selectionReset } = cartSlice.actions
export default cartSlice.reducer

// ---------------------------------------------------------------------------
// Selectors
// ---------------------------------------------------------------------------
const EMPTY = []
export const selectCart = (state) => state.cart.data
export const selectCartStatus = (state) => state.cart.status
export const selectCartError = (state) => state.cart.error
export const selectCartLineCount = (state) => state.cart.data?.lineCount ?? 0
export const selectCartStores = (state) => state.cart.data?.stores ?? EMPTY
export const selectSelectedIds = (state) => state.cart.selectedIds

export const selectCartLines = createSelector([selectCart], (cart) => allLines(cart))

export const selectSelectableIds = createSelector([selectCartLines], (lines) =>
  lines.filter(isLineSelectable).map((l) => l.cartItemPublicId),
)

// Selected lines grouped by store: [{ storePublicId, storeName, lines }]
export const selectSelectedGroups = createSelector([selectCartStores, selectSelectedIds], (stores, ids) =>
  stores
    .map((store) => ({ ...store, lines: (store.lines ?? []).filter((l) => ids.includes(l.cartItemPublicId)) }))
    .filter((store) => store.lines.length > 0),
)

export const selectSelectedLineCount = createSelector([selectSelectedGroups], (groups) =>
  groups.reduce((n, g) => n + g.lines.length, 0),
)

// Display only: adds the server's lineTotal values in whole cents (avoids 0.1 + 0.2 issues).
export const selectSelectedTotal = createSelector([selectSelectedGroups], (groups) => {
  const cents = groups.flatMap((g) => g.lines).reduce((sum, l) => sum + Math.round(Number(l.lineTotal ?? 0) * 100), 0)
  return cents / 100
})
