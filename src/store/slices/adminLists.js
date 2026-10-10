// Paged lists of the admin console, one createPagedResource per list.
// Each `name` is also its key in app/store.js (see ADMIN_LIST_REDUCERS).
// Pages read them with usePagedList(adminLists.users, params).
import { createPagedResource } from '@/store/factories/createPagedResource'
import * as adminApi from '@/api/admin'

const list = (name, fetchPage, defaultQuery) => createPagedResource({ name, fetchPage, defaultQuery })

export const adminLists = {
  users: list('adminUsers', adminApi.listUsers, { sort: 'createdAt,desc' }),
  pendingMerchants: list('adminPendingMerchants', adminApi.listPendingMerchants, { sort: 'createdAt,asc' }),
  stores: list('adminStores', adminApi.listStores, { sort: 'name,asc' }),
  atRisk: list('adminAtRisk', adminApi.listAtRiskMerchants, { sort: 'score,asc' }),
  orders: list('adminOrders', adminApi.listOrders, { sort: 'placedAt,desc' }),
  complaints: list('adminComplaints', adminApi.listComplaints),
  flaggedReferences: list('adminFlaggedReferences', adminApi.listFlaggedReferences),
  codObjections: list('adminCodObjections', adminApi.listCodObjections, { sort: 'createdAt,desc' }),
  banks: list('adminBanks', adminApi.listBanks, { size: 50 }),
  couriers: list('adminCouriers', adminApi.listCouriers, { size: 50 }),
  admins: list('adminAdmins', adminApi.listAdmins),
  holidays: list('adminHolidays', adminApi.listHolidays, { sort: 'date,asc' }),
}

export const ADMIN_LIST_REDUCERS = Object.fromEntries(Object.values(adminLists).map((r) => [r.slice.name, r.reducer]))
