import { useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { ShoppingBag } from 'lucide-react'
import {
  fetchCustomerOrders,
  selectCustomerOrders,
  selectCustomerOrdersError,
  selectCustomerOrdersPageInfo,
  selectCustomerOrdersStatus,
} from '@/store/slices/customerOrdersSlice'
import { PAGE_SIZE_OPTIONS } from '@/config/constants'
import { CUSTOMER_DEADLINE_TYPES, CUSTOMER_ORDER_TABS, ORDER_SORT_OPTIONS } from '@/config/orders'
import { useUrlQuery } from '@/hooks/useUrlQuery'
import { formatDate, formatMoney } from '@/utils/format'
import AsyncContent from '@/components/common/AsyncContent'
import PageHeader from '@/components/common/PageHeader'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Countdown from '@/components/ui/Countdown'
import EmptyState from '@/components/ui/EmptyState'
import Pagination from '@/components/ui/Pagination'
import Select from '@/components/ui/Select'
import StatusBadge from '@/components/ui/StatusBadge'
import Table from '@/components/ui/Table'
import Tabs from '@/components/ui/Tabs'

const DEFAULTS = { tab: 'active', sort: 'placedAt,desc', page: 0, size: 20 }

const COLUMNS = [
  {
    key: 'publicId',
    header: 'Order',
    primary: true,
    render: (o) => (
      <span>
        <span className="font-medium text-slate-900 dark:text-white">{o.publicId}</span>
        <span className="block text-xs font-normal text-slate-500 md:hidden">{o.storeName}</span>
      </span>
    ),
  },
  { key: 'storeName', header: 'Store', hideOnMobile: true },
  { key: 'status', header: 'Status', render: (o) => <StatusBadge value={o.status} type="OrderStatus" /> },
  { key: 'itemCount', header: 'Items', className: 'tabular-nums' },
  { key: 'grandTotal', header: 'Total', className: 'tabular-nums whitespace-nowrap', render: (o) => formatMoney(o.grandTotal) },
  {
    key: 'deadlineAt',
    header: 'Time left',
    render: (o) => (CUSTOMER_DEADLINE_TYPES.includes(o.deadlineType) && o.deadlineAt ? <Countdown deadlineAt={o.deadlineAt} /> : '—'),
  },
  { key: 'placedAt', header: 'Placed', className: 'whitespace-nowrap', render: (o) => formatDate(o.placedAt) },
]

export default function OrdersPage() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const [query, setQuery] = useUrlQuery(DEFAULTS)
  const items = useSelector(selectCustomerOrders)
  const pageInfo = useSelector(selectCustomerOrdersPageInfo)
  const status = useSelector(selectCustomerOrdersStatus)
  const error = useSelector(selectCustomerOrdersError)

  const tab = CUSTOMER_ORDER_TABS.find((t) => t.value === query.tab) ?? CUSTOMER_ORDER_TABS[0]
  const params = useMemo(
    () => ({
      status: tab.statuses, // sent as status=A&status=B
      sort: ORDER_SORT_OPTIONS.some((o) => o.value === query.sort) ? query.sort : DEFAULTS.sort,
      page: query.page,
      size: query.size,
    }),
    [tab, query.sort, query.page, query.size],
  )

  useEffect(() => {
    dispatch(fetchCustomerOrders(params))
  }, [dispatch, params])

  return (
    <>
      <PageHeader title="My orders" description="Track quotes, payments and deliveries." />
      <Card className="p-4 sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <Tabs
            tabs={CUSTOMER_ORDER_TABS.map(({ value, label }) => ({ value, label }))}
            value={tab.value}
            onChange={(value) => setQuery({ tab: value })}
            className="min-w-0 flex-1"
          />
          <Select
            aria-label="Sort orders"
            value={params.sort}
            onChange={(e) => setQuery({ sort: e.target.value })}
            options={ORDER_SORT_OPTIONS}
            className="h-9 lg:w-52"
          />
        </div>

        <div className="mt-4">
          <AsyncContent
            status={status}
            error={error}
            onRetry={() => dispatch(fetchCustomerOrders(params))}
            isEmpty={items.length === 0}
            empty={
              <EmptyState
                icon={ShoppingBag}
                title={tab.value === 'all' ? 'No orders yet' : 'Nothing here'}
                description={tab.value === 'all' ? 'When you place an order it will appear here.' : 'No orders match this tab.'}
                action={<Button to="/search">Start shopping</Button>}
              />
            }
          >
            <Table columns={COLUMNS} rows={items} caption="Your orders" onRowClick={(o) => navigate(`/orders/${o.publicId}`)} />
            <Pagination
              {...pageInfo}
              sizeOptions={PAGE_SIZE_OPTIONS}
              onPageChange={(page) => setQuery({ page }, { resetPage: false })}
              onSizeChange={(size) => setQuery({ size })}
            />
          </AsyncContent>
        </div>
      </Card>
    </>
  )
}
