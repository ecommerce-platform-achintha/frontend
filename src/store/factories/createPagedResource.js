// Builds a Redux slice for one paged list (orders, products, users, ...).
//
// Usage (one file per resource, e.g. store/slices/merchantOrdersSlice.js):
//   const resource = createPagedResource({ name: 'merchantOrders', fetchPage: ordersApi.listMerchantOrders })
//   export const fetchMerchantOrders = resource.fetchList
//   export const { selectItems: selectMerchantOrders, ... } = resource.selectors
//   export default resource.reducer
// Then add `merchantOrders: reducer` to app/store.js (the key MUST equal `name`).
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { DEFAULT_PAGE_SIZE } from '@/config/constants'

const emptyPage = { page: 0, size: DEFAULT_PAGE_SIZE, totalElements: 0, totalPages: 0 }

// Drops empty filters so the URL stays clean (`q=` or `status=[]` are not sent).
function cleanParams(query) {
  return Object.fromEntries(
    Object.entries(query).filter(([, v]) => v !== undefined && v !== null && v !== '' && !(Array.isArray(v) && v.length === 0)),
  )
}

/**
 * @param {object} options
 * @param {string} options.name       slice name and store key
 * @param {(params) => Promise<{content, page, size, totalElements, totalPages}>} options.fetchPage
 * @param {object} [options.defaultQuery] e.g. { sort: 'placedAt,desc' }
 */
export function createPagedResource({ name, fetchPage, defaultQuery = {} }) {
  const initialQuery = { page: 0, size: DEFAULT_PAGE_SIZE, ...defaultQuery }

  const initialState = {
    items: [],
    pageInfo: emptyPage,
    query: initialQuery,
    status: 'idle', // idle | loading | succeeded | failed
    error: null,
    requestId: null, // ignore responses from older requests
  }

  // Thunk argument: { page, size, sort, ...filters }. It is merged into the last query,
  // so `fetchList({ page: 2 })` keeps the current filters.
  const fetchList = createAsyncThunk(`${name}/fetchList`, async (args = {}, { getState, rejectWithValue }) => {
    const query = { ...getState()[name].query, ...args }
    try {
      const data = await fetchPage(cleanParams(query))
      return { data, query }
    } catch (error) {
      return rejectWithValue(error)
    }
  })

  const slice = createSlice({
    name,
    initialState,
    reducers: {
      // Replace filters (page goes back to 0). Call fetchList() afterwards.
      setQuery(state, action) {
        state.query = { ...initialQuery, ...action.payload }
      },
      // Patch one item after a mutation, e.g. a status change from a detail page.
      itemUpdated(state, action) {
        const { idKey = 'publicId', item } = action.payload
        const index = state.items.findIndex((x) => x[idKey] === item[idKey])
        if (index >= 0) state.items[index] = { ...state.items[index], ...item }
      },
      reset: () => initialState,
    },
    extraReducers: (builder) => {
      builder
        .addCase(fetchList.pending, (state, action) => {
          state.status = 'loading'
          state.error = null
          state.requestId = action.meta.requestId
          state.query = { ...state.query, ...action.meta.arg }
        })
        .addCase(fetchList.fulfilled, (state, action) => {
          if (state.requestId !== action.meta.requestId) return
          const { data } = action.payload
          state.status = 'succeeded'
          state.items = data?.content ?? []
          // Read the size back: the server silently caps it.
          state.pageInfo = {
            page: data?.page ?? 0,
            size: data?.size ?? state.query.size,
            totalElements: data?.totalElements ?? 0,
            totalPages: data?.totalPages ?? 0,
          }
        })
        .addCase(fetchList.rejected, (state, action) => {
          if (state.requestId !== action.meta.requestId) return
          state.status = 'failed'
          state.error = action.payload ?? { message: action.error.message }
        })
    },
  })

  const selectState = (state) => state[name]
  const selectors = {
    selectState,
    selectItems: (state) => selectState(state).items,
    selectPageInfo: (state) => selectState(state).pageInfo,
    selectQuery: (state) => selectState(state).query,
    selectStatus: (state) => selectState(state).status,
    selectError: (state) => selectState(state).error,
    selectIsLoading: (state) => selectState(state).status === 'loading',
  }

  return { slice, reducer: slice.reducer, actions: slice.actions, fetchList, selectors }
}
