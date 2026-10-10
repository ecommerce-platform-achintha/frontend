import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Flag } from 'lucide-react'
import * as adminApi from '@/api/admin'
import { adminLists } from '@/store/slices/adminLists'
import { FLAG_REVIEW_OPTIONS } from '@/config/admin'
import { ADMIN_PAGE_SIZE_OPTIONS } from '@/config/constants'
import { ENUMS } from '@/config/enums'
import { useActionDialog } from '@/hooks/useActionDialog'
import { usePagedList } from '@/hooks/usePagedList'
import { useToast } from '@/hooks/useToast'
import { useUrlQuery } from '@/hooks/useUrlQuery'
import { formatDateTime } from '@/utils/format'
import DecisionDialog from '@/components/admin/DecisionDialog'
import AsyncContent from '@/components/common/AsyncContent'
import FormAlert from '@/components/common/FormAlert'
import PageHeader from '@/components/common/PageHeader'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import EmptyState from '@/components/ui/EmptyState'
import Pagination from '@/components/ui/Pagination'
import Select from '@/components/ui/Select'
import StatusBadge from '@/components/ui/StatusBadge'
import Table from '@/components/ui/Table'

const DEFAULTS = { status: '', page: 0, size: 20 }
const STATUS_OPTIONS = ENUMS.FlagStatus.map((s) => ({ value: s, label: s.charAt(0) + s.slice(1).toLowerCase() }))
const link = (to, text) => (
  <Link to={to} onClick={(e) => e.stopPropagation()} className="font-mono text-primary-700 hover:underline dark:text-primary-300">
    {text}
  </Link>
)

export default function AdminFlaggedReferencesPage() {
  const toast = useToast()
  const dialog = useActionDialog()
  const [query, setQuery] = useUrlQuery(DEFAULTS)
  const params = useMemo(() => ({ status: query.status || undefined, page: query.page, size: query.size }), [query])
  const { items, pageInfo, status, error, reload } = usePagedList(adminLists.flaggedReferences, params)

  const columns = [
    {
      key: 'reference',
      header: 'Reference',
      primary: true,
      render: (f) => (
        <span>
          <span className="font-mono font-medium">{f.reference}</span> <span className="text-xs text-slate-500">· {f.bankCode}</span>
        </span>
      ),
    },
    { key: 'status', header: 'Status', render: (f) => <StatusBadge value={f.status} type="FlagStatus" /> },
    { key: 'orderPublicId', header: 'Order', render: (f) => link(`/admin/orders/${f.orderPublicId}`, f.orderPublicId) },
    { key: 'originalOrderPublicId', header: 'First used on', render: (f) => (f.originalOrderPublicId ? link(`/admin/orders/${f.originalOrderPublicId}`, f.originalOrderPublicId) : '—') },
    { key: 'customerPublicId', header: 'Customer', render: (f) => link(`/admin/users/${f.customerPublicId}`, f.customerPublicId) },
    { key: 'storePublicId', header: 'Store', render: (f) => link(`/admin/stores/${f.storePublicId}`, f.storePublicId) },
    { key: 'createdAt', header: 'Flagged', className: 'whitespace-nowrap', render: (f) => formatDateTime(f.createdAt) },
    {
      key: 'review',
      header: <span className="sr-only">Review</span>,
      render: (f) =>
        f.status === 'OPEN' ? (
          <Button size="sm" variant="outline" onClick={() => dialog.open('review', f)}>
            Review
          </Button>
        ) : (
          <span className="text-xs text-slate-500">{f.reviewNote ? `“${f.reviewNote}”` : ''}</span>
        ),
    },
  ]

  return (
    <>
      <PageHeader title="Flagged payment references" description="Bank references that were already used with the same bank. A customer cannot reuse a reference." />
      <Card className="space-y-4 p-4 sm:p-5">
        <Select aria-label="Status" value={query.status} onChange={(e) => setQuery({ status: e.target.value })} options={STATUS_OPTIONS} placeholder="All statuses" className="sm:w-52" />
        <AsyncContent status={status} error={error} onRetry={reload} isEmpty={items.length === 0} empty={<EmptyState icon={Flag} title="Nothing flagged here" />}>
          <Table columns={columns} rows={items} caption="Flagged references" />
          <Pagination
            {...pageInfo}
            sizeOptions={ADMIN_PAGE_SIZE_OPTIONS}
            onPageChange={(page) => setQuery({ page }, { resetPage: false })}
            onSizeChange={(size) => setQuery({ size })}
          />
        </AsyncContent>
      </Card>

      {dialog.isOpen('review') && (
        <DecisionDialog
          title={`Review reference ${dialog.target.reference}`}
          options={FLAG_REVIEW_OPTIONS}
          confirmLabel="Save review"
          error={dialog.error}
          onCancel={dialog.close}
          onConfirm={dialog.run(
            (action, note) => adminApi.reviewFlaggedReference(dialog.target.publicId, { action, note }),
            'Review saved.',
            reload,
            (err) => {
              if (err?.code === 'FLAG_ALREADY_REVIEWED') {
                dialog.close()
                toast.warning('This reference was already reviewed. We reloaded the list.')
                reload()
              }
            },
          )}
        >
          <FormAlert tone="info">
            To ban someone after escalating, open their page:{' '}
            <Link to={`/admin/users/${dialog.target.customerPublicId}`} className="font-semibold underline">
              customer account
            </Link>
            . For the merchant, open the{' '}
            <Link to={`/admin/stores/${dialog.target.storePublicId}`} className="font-semibold underline">
              store
            </Link>{' '}
            and follow “Find the owner account” (stores do not carry the owner’s user id).
          </FormAlert>
        </DecisionDialog>
      )}
    </>
  )
}
