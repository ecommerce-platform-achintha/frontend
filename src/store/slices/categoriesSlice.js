// Public categories (header menu, search filters). Plain array from the API; we build the tree.
import { createAsyncThunk, createSelector, createSlice } from '@reduxjs/toolkit'
import * as catalogApi from '@/api/catalog'

export const fetchCategories = createAsyncThunk(
  'categories/fetch',
  async (_, { rejectWithValue }) => {
    try {
      return await catalogApi.listPublicCategories()
    } catch (error) {
      return rejectWithValue(error)
    }
  },
  {
    // Load once per page view; skip if already loaded or loading.
    condition: (_, { getState }) => getState().categories.status === 'idle' || getState().categories.status === 'failed',
  },
)

const categoriesSlice = createSlice({
  name: 'categories',
  initialState: { items: [], status: 'idle', error: null },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchCategories.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(fetchCategories.fulfilled, (state, action) => {
        state.status = 'succeeded'
        state.items = Array.isArray(action.payload) ? action.payload : []
      })
      .addCase(fetchCategories.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload ?? null
      })
  },
})

export default categoriesSlice.reducer

export const selectCategories = (state) => state.categories.items
export const selectCategoriesStatus = (state) => state.categories.status

// Parents are top-level only, so the tree is two levels: [{ ...parent, children: [...] }].
export const selectCategoryTree = createSelector([selectCategories], (items) => {
  const active = items.filter((c) => c.active !== false)
  const parents = active.filter((c) => !c.parentSlug)
  return parents.map((parent) => ({
    ...parent,
    children: active.filter((c) => c.parentSlug === parent.slug),
  }))
})
