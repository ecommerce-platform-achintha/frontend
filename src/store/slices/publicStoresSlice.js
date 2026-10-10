// Cache of public store profiles by public id (store pages, search chips, checkout COD check).
// The cart has no codEnabled flag (contract 10.5), so checkout reads it from here.
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import * as storesApi from '@/api/stores'

export const fetchPublicStore = createAsyncThunk(
  'publicStores/fetchOne',
  async (publicId, { rejectWithValue }) => {
    try {
      return await storesApi.getPublicStore(publicId)
    } catch (error) {
      return rejectWithValue(error)
    }
  },
  {
    // Cached: only load each store once per page view (retry after a failure).
    condition: (publicId, { getState }) => {
      const status = getState().publicStores.status[publicId]
      return status !== 'loading' && status !== 'succeeded'
    },
  },
)

const publicStoresSlice = createSlice({
  name: 'publicStores',
  initialState: { byId: {}, status: {}, error: {} },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchPublicStore.pending, (state, action) => {
        state.status[action.meta.arg] = 'loading'
        delete state.error[action.meta.arg]
      })
      .addCase(fetchPublicStore.fulfilled, (state, action) => {
        state.status[action.meta.arg] = 'succeeded'
        state.byId[action.meta.arg] = action.payload
      })
      .addCase(fetchPublicStore.rejected, (state, action) => {
        state.status[action.meta.arg] = 'failed'
        state.error[action.meta.arg] = action.payload ?? { message: action.error.message }
      })
  },
})

export default publicStoresSlice.reducer

export const selectPublicStore = (state, publicId) => state.publicStores.byId[publicId] ?? null
export const selectPublicStoreStatus = (state, publicId) => state.publicStores.status[publicId] ?? 'idle'
export const selectPublicStoreError = (state, publicId) => state.publicStores.error[publicId] ?? null
export const selectPublicStoresById = (state) => state.publicStores.byId
export const selectPublicStoreStatuses = (state) => state.publicStores.status
