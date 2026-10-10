// Public reviews of one store. Pass storePublicId in every fetch.
import { createPagedResource } from '@/store/factories/createPagedResource'
import * as storesApi from '@/api/stores'

const resource = createPagedResource({
  name: 'storeReviews',
  fetchPage: ({ storePublicId, ...params }) => storesApi.listPublicStoreReviews(storePublicId, params),
  defaultQuery: { sort: 'createdAt,desc', size: 5 },
})

export const fetchStoreReviews = resource.fetchList
export const { setQuery: setStoreReviewsQuery, itemUpdated: storeReviewsItemUpdated, reset: resetStoreReviews } = resource.actions
export const {
  selectItems: selectStoreReviews,
  selectPageInfo: selectStoreReviewsPageInfo,
  selectStatus: selectStoreReviewsStatus,
  selectError: selectStoreReviewsError,
  selectQuery: selectStoreReviewsQuery,
} = resource.selectors
export default resource.reducer
