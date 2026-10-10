import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShoppingBag } from 'lucide-react'
import { adminLists } from '@/store/slices/adminLists'
import { ADMIN_STATUS_LABELS } from '@/config/admin'
import { ADMIN_PAGE_SIZE_OPTIONS } from '@/config/constants'
import { ENUMS } from '@/config/enums'
import { ORDER_SORT_OPTIONS } from '@/config/orders'
import { usePagedList } from '@/hooks/usePagedList'
import { useUrlQuery } from '@/hooks/useUrlQuery'
import { formatDate, formatMoney } from '@/utils/format'
import StatusMultiSelect from '@/components/admin/StatusMultiSelect'
import AsyncContent from '@/components/common/AsyncContent'
import PageHeader from '@/components/common/PageHeader'
import { LateFlags } from '@/components/orders/OrderParts'
import Badge from '@/components/ui/Badge'
import Card from '@/components/ui/Card'
import EmptyState from '@/components/ui/EmptyState'
import Pagination from '@/components/ui/Pagination'
import Select from '@/components/ui/Select'
import StatusBadge from '@/components/ui/StatusBadge'
import Switch from '@/components/ui/Switch'
import Table from '@/components/ui/Table'

const DEFAULTS = { status: [], needsResolution: '', sort: 'placedAt,desc', page: 0, size: 20 }

const COLUMNS = [
  {
    key: 'publicId',
    header: 'Order',
    primary: true,
    render: (o) => (
      <span>
        <span className="font-medium text-slate-900 dark:text-white">{o.publicId}</span>
        <span className="block text-xs font-normal text-slate-500">{o.storeName}</span>
      </span>
    ),
  },
  { key: 'status', header: 'Status', render: (o) => <StatusBadge value={o.status} type="OrderStatus" label={ADMIN_STATUS_LABELS[o.status]} /> },
  { key: 'paymentMethod', header: 'Payment', render: (o) => <StatusBadge value={o.paymentMethod} type="PaymentMethod" /> },
  { key: 'grandTotal', header: 'Total', className: 'tabular-nums whitespace-nowrap', render: (o) => formatMoney(o.grandTotal) },
  {
    key: 'flags',
    header: 'Flags',
    render: (o) => (
      <span className="flex flex-wrap gap-1">
        {o.flags?.needsAdminResolution && <Badge tone="danger">Needs resolution</Badge>}
        <LateFlags flags={o.flags} />
      </span>
    ),
  },
  { key: 'placedAt', header: 'Placed', className: 'whitespace-nowrap', render: (o) => formatDate(o.placedAt) },
]

export default function AdminOrdersPage() {
  const navigate = useNavigate()
  const [query, setQuery] = useUrlQuery(DEFAULTS)
  const needsResolution = query.needsResolution === 'true'
  const params = useMemo(
    () => ({
      status: query.status, // repeated params
      needsResolution: needsResolution || undefined,
      sort: ORDER_SORT_OPTIONS.some((o) => o.value === query.sort) ? query.sort : DEFAULTS.sort,
      page: query.page,
      size: query.size,
    }),
    [query, needsResolution],
  )
  const { items, pageInfo, status, error, reload } = usePagedList(adminLists.orders, params)

  return (
    <>
      <PageHeader title="Orders" description="All orders across stores." />
      <Card className="space-y-4 p-4 sm:p-5">
        <StatusMultiSelect options={ENUMS.OrderStatus} labels={ADMIN_STATUS_LABELS} value={query.status} onChange={(s) => setQuery({ status: s })} />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Switch
            checked={needsResolution}
            onChange={(v) => setQuery({ needsResolution: v ? 'true' : '' })}
            label="Needs resolution"
            description="Open orders of banned merchants."
          />
          <Select aria-label="Sort orders" value={params.sort} onChange={(e) => setQuery({ sort: e.target.value })} options={ORDER_SORT_OPTIONS} className="sm:w-56" />
        </div>
        <AsyncContent status={status} error={error} onRetry={reload} isEmpty={items.length === 0} empty={<EmptyState icon={ShoppingBag} title="No orders match" />}>
          <Table columns={COLUMNS} rows={items} caption="Orders" onRowClick={(o) => navigate(`/admin/orders/${o.publicId}`)} />
          <Pagination
            {...pageInfo}
            sizeOptions={ADMIN_PAGE_SIZE_OPTIONS}
            onPageChange={(page) => setQuery({ page }, { resetPage: false })}
            onSizeChange={(size) => setQuery({ size })}
          />
        </AsyncContent>
      </Card>
    </>
  )
}
