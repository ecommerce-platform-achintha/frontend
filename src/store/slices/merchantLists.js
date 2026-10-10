// Paged lists of the seller center, one createPagedResource per list.
// Each `name` is also its key in app/store.js (see MERCHANT_LIST_REDUCERS).
// Pages read them with usePagedList(merchantLists.orders, params).
import { createPagedResource } from '@/store/factories/createPagedResource'
import * as catalogApi from '@/api/catalog'
import * as ordersApi from '@/api/orders'
import * as storesApi from '@/api/stores'
import * as usersApi from '@/api/users'

export const merchantLists = {
  orders: createPagedResource({ name: 'merchantOrders', fetchPage: ordersApi.listMerchantOrders, defaultQuery: { sort: 'placedAt,desc' } }),
  complaints: createPagedResource({ name: 'merchantComplaints', fetchPage: ordersApi.listMerchantComplaints, defaultQuery: { sort: 'createdAt,desc' } }),
  products: createPagedResource({ name: 'merchantProducts', fetchPage: catalogApi.listMerchantProducts, defaultQuery: { sort: 'updatedAt,desc' } }),
  discounts: createPagedResource({ name: 'merchantDiscounts', fetchPage: catalogApi.listDiscounts, defaultQuery: { sort: 'createdAt,desc' } }),
  storeReviews: createPagedResource({ name: 'merchantStoreReviews', fetchPage: storesApi.listMerchantStoreReviews, defaultQuery: { sort: 'createdAt,desc' } }),
  productReviews: createPagedResource({ name: 'merchantProductReviews', fetchPage: catalogApi.listMerchantProductReviews }),
  customerBlocks: createPagedResource({ name: 'merchantCustomerBlocks', fetchPage: ordersApi.listCustomerBlocks }),
  assistants: createPagedResource({ name: 'merchantAssistants', fetchPage: usersApi.listAssistants, defaultQuery: { sort: 'createdAt,desc' } }),
  bankAccounts: createPagedResource({ name: 'merchantBankAccounts', fetchPage: storesApi.listBankAccounts }),
  shippingTemplates: createPagedResource({ name: 'merchantShippingTemplates', fetchPage: storesApi.listShippingTemplates }),
}

export const MERCHANT_LIST_REDUCERS = Object.fromEntries(Object.values(merchantLists).map((r) => [r.slice.name, r.reducer]))
