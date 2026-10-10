import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { MessageSquareWarning } from 'lucide-react'
import { merchantLists } from '@/store/slices/merchantLists'
import { PAGE_SIZE_OPTIONS } from '@/config/constants'
import { MERCHANT_COMPLAINT_TABS } from '@/config/merchant'
import { usePagedList } from '@/hooks/usePagedList'
import { useUrlQuery } from '@/hooks/useUrlQuery'
import { formatDate, humanizeEnum } from '@/utils/format'
import AsyncContent from '@/components/common/AsyncContent'
import PageHeader from '@/components/common/PageHeader'
import Card from '@/components/ui/Card'
import EmptyState from '@/components/ui/EmptyState'
import Pagination from '@/components/ui/Pagination'
import StatusBadge from '@/components/ui/StatusBadge'
import Table from '@/components/ui/Table'
import Tabs from '@/components/ui/Tabs'

const DEFAULTS = { tab: 'open', page: 0, size: 20 }

const COLUMNS = [
  { key: 'publicId', header: 'Complaint', primary: true, render: (c) => <span className="font-medium text-slate-900 dark:text-white">{c.publicId}</span> },
  { key: 'orderPublicId', header: 'Order' },
  { key: 'type', header: 'Type', render: (c) => humanizeEnum(c.type) },
  { key: 'status', header: 'Status', render: (c) => <StatusBadge value={c.status} type="ComplaintStatus" /> },
  { key: 'response', header: 'Your answer', render: (c) => (c.response ? 'Sent' : 'Not yet') },
  { key: 'createdAt', header: 'Filed', className: 'whitespace-nowrap', render: (c) => formatDate(c.createdAt) },
]

export default function MerchantComplaintsPage() {
  const navigate = useNavigate()
  const [query, setQuery] = useUrlQuery(DEFAULTS)
  const tab = MERCHANT_COMPLAINT_TABS.find((t) => t.value === query.tab) ?? MERCHANT_COMPLAINT_TABS[0]
  const params = useMemo(() => ({ status: tab.statuses, page: query.page, size: query.size, sort: 'createdAt,desc' }), [tab, query.page, query.size])
  const { items, pageInfo, status, error, reload } = usePagedList(merchantLists.complaints, params)

  return (
    <>
      <PageHeader title="Complaints" description="Problems customers reported about their orders. Answer each one; the marketplace team decides." />
      <Card className="p-4 sm:p-5">
        <Tabs tabs={MERCHANT_COMPLAINT_TABS} value={tab.value} onChange={(value) => setQuery({ tab: value })} />
        <div className="mt-4">
          <AsyncContent
            status={status}
            error={error}
            onRetry={reload}
            isEmpty={items.length === 0}
            empty={<EmptyState icon={MessageSquareWarning} title="No complaints here" description="Good news: nothing to answer in this tab." />}
          >
            <Table columns={COLUMNS} rows={items} caption="Complaints" onRowClick={(c) => navigate(`/merchant/complaints/${c.publicId}`)} />
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
