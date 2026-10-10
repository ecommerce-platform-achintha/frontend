// Public product search results (/search, store pages).
import { createPagedResource } from '@/store/factories/createPagedResource'
import * as catalogApi from '@/api/catalog'

const resource = createPagedResource({
  name: 'productSearch',
  fetchPage: catalogApi.searchProducts,
  defaultQuery: { sort: 'relevance', size: 24 },
})

export const fetchProductSearch = resource.fetchList
export const { setQuery: setProductSearchQuery, itemUpdated: productSearchItemUpdated, reset: resetProductSearch } = resource.actions
export const {
  selectItems: selectProductSearch,
  selectPageInfo: selectProductSearchPageInfo,
  selectStatus: selectProductSearchStatus,
  selectError: selectProductSearchError,
  selectQuery: selectProductSearchQuery,
} = resource.selectors
export default resource.reducer
