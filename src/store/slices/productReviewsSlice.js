// Public reviews of one product. Pass productPublicId in every fetch.
import { createPagedResource } from '@/store/factories/createPagedResource'
import * as catalogApi from '@/api/catalog'

const resource = createPagedResource({
  name: 'productReviews',
  fetchPage: ({ productPublicId, ...params }) => catalogApi.listPublicProductReviews(productPublicId, params),
  defaultQuery: { sort: 'createdAt,desc', size: 5 },
})

export const fetchProductReviews = resource.fetchList
export const { setQuery: setProductReviewsQuery, itemUpdated: productReviewsItemUpdated, reset: resetProductReviews } = resource.actions
export const {
  selectItems: selectProductReviews,
  selectPageInfo: selectProductReviewsPageInfo,
  selectStatus: selectProductReviewsStatus,
  selectError: selectProductReviewsError,
  selectQuery: selectProductReviewsQuery,
} = resource.selectors
export default resource.reducer
