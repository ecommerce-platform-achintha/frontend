import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Ban } from 'lucide-react'
import * as adminApi from '@/api/admin'
import { adminLists } from '@/store/slices/adminLists'
import { COD_OBJECTION_OPTIONS, COD_OBJECTION_SORT } from '@/config/admin'
import { ADMIN_PAGE_SIZE_OPTIONS } from '@/config/constants'
import { ENUMS } from '@/config/enums'
import { useActionDialog } from '@/hooks/useActionDialog'
import { usePagedList } from '@/hooks/usePagedList'
import { useToast } from '@/hooks/useToast'
import { useUrlQuery } from '@/hooks/useUrlQuery'
import { formatDateTime } from '@/utils/format'
import DecisionDialog from '@/components/admin/DecisionDialog'
import AsyncContent from '@/components/common/AsyncContent'
import PageHeader from '@/components/common/PageHeader'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import EmptyState from '@/components/ui/EmptyState'
import Pagination from '@/components/ui/Pagination'
import Select from '@/components/ui/Select'
import StatusBadge from '@/components/ui/StatusBadge'

const DEFAULTS = { status: '', page: 0, size: 20 }
const STATUS_OPTIONS = ENUMS.ObjectionStatus.map((s) => ({ value: s, label: s.charAt(0) + s.slice(1).toLowerCase() }))
const linkClass = 'font-medium text-primary-700 hover:underline dark:text-primary-300'

/*
 * The contract names the endpoint but not the item fields. We read orderPublicId, customerPublicId,
 * storePublicId, text, status, createdAt, and decision / note / decidedAt when present.
 */
export default function AdminCodObjectionsPage() {
  const toast = useToast()
  const dialog = useActionDialog()
  const [query, setQuery] = useUrlQuery(DEFAULTS)
  const params = useMemo(() => ({ status: query.status || undefined, sort: COD_OBJECTION_SORT, page: query.page, size: query.size }), [query])
  const { items, pageInfo, status, error, reload } = usePagedList(adminLists.codObjections, params)

  return (
    <>
      <PageHeader title="COD objections" description="Customers disputing a cash-on-delivery refusal reported by a store." />
      <Card className="space-y-4 p-4 sm:p-5">
        <Select aria-label="Status" value={query.status} onChange={(e) => setQuery({ status: e.target.value })} options={STATUS_OPTIONS} placeholder="All statuses" className="sm:w-52" />
        <AsyncContent status={status} error={error} onRetry={reload} isEmpty={items.length === 0} empty={<EmptyState icon={Ban} title="No objections here" />}>
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {items.map((o) => (
              <li key={o.publicId ?? o.orderPublicId} className="flex flex-wrap items-start justify-between gap-3 py-4">
                <div className="min-w-0 flex-1 space-y-1 text-sm">
                  <p className="flex flex-wrap items-center gap-2">
                    <StatusBadge value={o.status} type="ObjectionStatus" />
                    <Link to={`/admin/orders/${o.orderPublicId}`} className={linkClass}>
                      {o.orderPublicId}
                    </Link>
                    <span className="text-xs text-slate-500">{formatDateTime(o.createdAt)}</span>
                  </p>
                  <p className="whitespace-pre-line text-slate-700 dark:text-slate-300">“{o.text}”</p>
                  <p className="flex flex-wrap gap-3 text-xs">
                    {o.customerPublicId && (
                      <Link to={`/admin/users/${o.customerPublicId}`} className={linkClass}>
                        Customer and score
                      </Link>
                    )}
                    {o.storePublicId && (
                      <Link to={`/admin/stores/${o.storePublicId}`} className={linkClass}>
                        Store
                      </Link>
                    )}
                  </p>
                  {o.note && <p className="text-xs text-slate-500">Decision note: {o.note}</p>}
                </div>
                {o.status === 'OPEN' && (
                  <Button size="sm" variant="outline" onClick={() => dialog.open('decide', o)}>
                    Decide
                  </Button>
                )}
              </li>
            ))}
          </ul>
          <Pagination
            {...pageInfo}
            sizeOptions={ADMIN_PAGE_SIZE_OPTIONS}
            onPageChange={(page) => setQuery({ page }, { resetPage: false })}
            onSizeChange={(size) => setQuery({ size })}
          />
        </AsyncContent>
      </Card>

      {dialog.isOpen('decide') && (
        <DecisionDialog
          title={`Objection on ${dialog.target.orderPublicId}`}
          description="The customer says they did not refuse the delivery."
          options={COD_OBJECTION_OPTIONS}
          confirmLabel="Save decision"
          error={dialog.error}
          onCancel={dialog.close}
          onConfirm={dialog.run(
            (decision, note) => adminApi.decideCodObjection(dialog.target.orderPublicId, { decision, note }),
            'Decision saved.',
            reload,
            (err) => {
              if (err?.code === 'OBJECTION_ALREADY_DECIDED') {
                dialog.close()
                toast.warning('This objection was already decided. We reloaded the list.')
                reload()
              }
            },
          )}
        />
      )}
    </>
  )
}
