import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShoppingBag } from 'lucide-react'
import { merchantLists } from '@/store/slices/merchantLists'
import { PAGE_SIZE_OPTIONS } from '@/config/constants'
import { MERCHANT_DEADLINE_TYPES, MERCHANT_ORDER_TABS, MERCHANT_STATUS_LABELS } from '@/config/merchant'
import { ORDER_SORT_OPTIONS } from '@/config/orders'
import { usePagedList } from '@/hooks/usePagedList'
import { useUrlQuery } from '@/hooks/useUrlQuery'
import { formatDate, formatMoney } from '@/utils/format'
import AsyncContent from '@/components/common/AsyncContent'
import PageHeader from '@/components/common/PageHeader'
import { LateFlags } from '@/components/orders/OrderParts'
import Card from '@/components/ui/Card'
import Countdown from '@/components/ui/Countdown'
import EmptyState from '@/components/ui/EmptyState'
import Pagination from '@/components/ui/Pagination'
import Select from '@/components/ui/Select'
import StatusBadge from '@/components/ui/StatusBadge'
import Table from '@/components/ui/Table'
import Tabs from '@/components/ui/Tabs'

const DEFAULTS = { tab: 'quote', sort: 'deadlineAt,asc', page: 0, size: 20 }

// The customer score is shown only on the detail page, not in the list.
const COLUMNS = [
  {
    key: 'publicId',
    header: 'Order',
    primary: true,
    render: (o) => <span className="font-medium text-slate-900 dark:text-white">{o.publicId}</span>,
  },
  {
    key: 'status',
    header: 'Status',
    render: (o) => (
      <span className="flex flex-wrap items-center gap-1">
        <StatusBadge value={o.status} type="OrderStatus" label={MERCHANT_STATUS_LABELS[o.status]} />
        <StatusBadge value={o.paymentMethod} type="PaymentMethod" />
      </span>
    ),
  },
  { key: 'itemCount', header: 'Items', className: 'tabular-nums' },
  { key: 'grandTotal', header: 'Total', className: 'tabular-nums whitespace-nowrap', render: (o) => formatMoney(o.grandTotal) },
  {
    key: 'deadlineAt',
    header: 'Deadline',
    render: (o) =>
      MERCHANT_DEADLINE_TYPES.includes(o.deadlineType) && o.deadlineAt ? (
        <Countdown deadlineAt={o.deadlineAt} overdueTone="danger" expiredLabel="Overdue" />
      ) : (
        '—'
      ),
  },
  { key: 'flags', header: 'Flags', render: (o) => <LateFlags flags={o.flags} /> },
  { key: 'placedAt', header: 'Placed', className: 'whitespace-nowrap', hideOnMobile: true, render: (o) => formatDate(o.placedAt) },
]

export default function MerchantOrdersPage() {
  const navigate = useNavigate()
  const [query, setQuery] = useUrlQuery(DEFAULTS)
  const tab = MERCHANT_ORDER_TABS.find((t) => t.value === query.tab) ?? MERCHANT_ORDER_TABS[0]
  const params = useMemo(
    () => ({
      status: tab.statuses, // sent as status=A&status=B
      sort: ORDER_SORT_OPTIONS.some((o) => o.value === query.sort) ? query.sort : DEFAULTS.sort,
      page: query.page,
      size: query.size,
    }),
    [tab, query.sort, query.page, query.size],
  )
  const { items, pageInfo, status, error, reload } = usePagedList(merchantLists.orders, params)

  return (
    <>
      <PageHeader title="Orders" description="Quote new orders, check payments and ship." />
      <Card className="p-4 sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <Tabs tabs={MERCHANT_ORDER_TABS} value={tab.value} onChange={(value) => setQuery({ tab: value })} className="min-w-0 flex-1" />
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
            onRetry={reload}
            isEmpty={items.length === 0}
            empty={<EmptyState icon={ShoppingBag} title="No orders here" description={tab.value === 'all' ? 'New orders appear here as customers place them.' : 'Nothing waiting in this tab.'} />}
          >
            <Table columns={COLUMNS} rows={items} caption="Store orders" onRowClick={(o) => navigate(`/merchant/orders/${o.publicId}`)} />
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
