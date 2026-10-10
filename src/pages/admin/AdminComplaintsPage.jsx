import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { MessageSquareWarning } from 'lucide-react'
import { adminLists } from '@/store/slices/adminLists'
import { COMPLAINT_STATUS_OPTIONS } from '@/config/admin'
import { ADMIN_PAGE_SIZE_OPTIONS } from '@/config/constants'
import { usePagedList } from '@/hooks/usePagedList'
import { useUrlQuery } from '@/hooks/useUrlQuery'
import { formatDate, humanizeEnum } from '@/utils/format'
import StatusMultiSelect from '@/components/admin/StatusMultiSelect'
import AsyncContent from '@/components/common/AsyncContent'
import PageHeader from '@/components/common/PageHeader'
import Card from '@/components/ui/Card'
import EmptyState from '@/components/ui/EmptyState'
import Pagination from '@/components/ui/Pagination'
import StatusBadge from '@/components/ui/StatusBadge'
import Table from '@/components/ui/Table'

const DEFAULTS = { status: [], page: 0, size: 20 }

const COLUMNS = [
  { key: 'publicId', header: 'Complaint', primary: true, render: (c) => <span className="font-medium text-slate-900 dark:text-white">{c.publicId}</span> },
  { key: 'orderPublicId', header: 'Order' },
  { key: 'type', header: 'Type', render: (c) => humanizeEnum(c.type) },
  { key: 'status', header: 'Status', render: (c) => <StatusBadge value={c.status} type="ComplaintStatus" /> },
  { key: 'response', header: 'Store answered', render: (c) => (c.response ? 'Yes' : 'No') },
  { key: 'createdAt', header: 'Filed', className: 'whitespace-nowrap', render: (c) => formatDate(c.createdAt) },
]

export default function AdminComplaintsPage() {
  const navigate = useNavigate()
  const [query, setQuery] = useUrlQuery(DEFAULTS)
  // No sort is sent: the contract lists no sort fields for this list.
  const params = useMemo(() => ({ status: query.status, page: query.page, size: query.size }), [query])
  const { items, pageInfo, status, error, reload } = usePagedList(adminLists.complaints, params)

  return (
    <>
      <PageHeader title="Complaints" description="Customer complaints about orders. Read the store’s answer, then decide." />
      <Card className="space-y-4 p-4 sm:p-5">
        <StatusMultiSelect options={COMPLAINT_STATUS_OPTIONS} value={query.status} onChange={(s) => setQuery({ status: s })} />
        <AsyncContent status={status} error={error} onRetry={reload} isEmpty={items.length === 0} empty={<EmptyState icon={MessageSquareWarning} title="No complaints match" />}>
          <Table columns={COLUMNS} rows={items} caption="Complaints" onRowClick={(c) => navigate(`/admin/complaints/${c.publicId}`)} />
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
