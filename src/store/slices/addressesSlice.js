// The signed-in user's saved addresses (/account/addresses, checkout).
import { createPagedResource } from '@/store/factories/createPagedResource'
import * as usersApi from '@/api/users'

const resource = createPagedResource({
  name: 'addresses',
  fetchPage: usersApi.listAddresses,
  defaultQuery: { sort: 'updatedAt,desc', size: 20 },
})

export const fetchAddresses = resource.fetchList
export const { setQuery: setAddressesQuery, itemUpdated: addressesItemUpdated, reset: resetAddresses } = resource.actions
export const {
  selectItems: selectAddresses,
  selectPageInfo: selectAddressesPageInfo,
  selectStatus: selectAddressesStatus,
  selectError: selectAddressesError,
  selectQuery: selectAddressesQuery,
} = resource.selectors
export default resource.reducer
