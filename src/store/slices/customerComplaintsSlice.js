// The customer's complaints (/complaints).
import { createPagedResource } from '@/store/factories/createPagedResource'
import * as ordersApi from '@/api/orders'

const resource = createPagedResource({
  name: 'customerComplaints',
  fetchPage: ordersApi.listCustomerComplaints,
  defaultQuery: { sort: 'createdAt,desc', size: 20 },
})

export const fetchCustomerComplaints = resource.fetchList
export const { setQuery: setCustomerComplaintsQuery, itemUpdated: customerComplaintsItemUpdated, reset: resetCustomerComplaints } = resource.actions
export const {
  selectItems: selectCustomerComplaints,
  selectPageInfo: selectCustomerComplaintsPageInfo,
  selectStatus: selectCustomerComplaintsStatus,
  selectError: selectCustomerComplaintsError,
  selectQuery: selectCustomerComplaintsQuery,
} = resource.selectors
export default resource.reducer
