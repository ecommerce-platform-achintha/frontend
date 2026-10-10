// Public store directory (/stores).
import { createPagedResource } from '@/store/factories/createPagedResource'
import * as storesApi from '@/api/stores'

const resource = createPagedResource({
  name: 'publicStoreList',
  fetchPage: storesApi.listPublicStores,
  defaultQuery: { sort: 'name,asc', size: 24 },
})

export const fetchPublicStoreList = resource.fetchList
export const { setQuery: setPublicStoreListQuery, itemUpdated: publicStoreListItemUpdated, reset: resetPublicStoreList } = resource.actions
export const {
  selectItems: selectPublicStoreList,
  selectPageInfo: selectPublicStoreListPageInfo,
  selectStatus: selectPublicStoreListStatus,
  selectError: selectPublicStoreListError,
  selectQuery: selectPublicStoreListQuery,
} = resource.selectors
export default resource.reducer
