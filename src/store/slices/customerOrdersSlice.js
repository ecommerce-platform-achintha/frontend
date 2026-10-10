// The customer's order list (/orders).
import { createPagedResource } from '@/store/factories/createPagedResource'
import * as ordersApi from '@/api/orders'

const resource = createPagedResource({
  name: 'customerOrders',
  fetchPage: ordersApi.listCustomerOrders,
  defaultQuery: { sort: 'placedAt,desc', size: 20 },
})

export const fetchCustomerOrders = resource.fetchList
export const { setQuery: setCustomerOrdersQuery, itemUpdated: customerOrdersItemUpdated, reset: resetCustomerOrders } = resource.actions
export const {
  selectItems: selectCustomerOrders,
  selectPageInfo: selectCustomerOrdersPageInfo,
  selectStatus: selectCustomerOrdersStatus,
  selectError: selectCustomerOrdersError,
  selectQuery: selectCustomerOrdersQuery,
} = resource.selectors
export default resource.reducer
