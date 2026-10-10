import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShieldCheck } from 'lucide-react'
import { adminLists } from '@/store/slices/adminLists'
import { AT_RISK_SORT_OPTIONS } from '@/config/admin'
import { ADMIN_PAGE_SIZE_OPTIONS } from '@/config/constants'
import { usePagedList } from '@/hooks/usePagedList'
import { useUrlQuery } from '@/hooks/useUrlQuery'
import { formatDateTime } from '@/utils/format'
import AsyncContent from '@/components/common/AsyncContent'
import FormAlert from '@/components/common/FormAlert'
import PageHeader from '@/components/common/PageHeader'
import Card from '@/components/ui/Card'
import EmptyState from '@/components/ui/EmptyState'
import Pagination from '@/components/ui/Pagination'
import Select from '@/components/ui/Select'
import Table from '@/components/ui/Table'

const DEFAULTS = { sort: 'score,asc', page: 0, size: 20 }

const COLUMNS = [
  { key: 'storeName', header: 'Store', primary: true, render: (r) => <span className="font-medium text-slate-900 dark:text-white">{r.storeName}</span> },
  { key: 'score', header: 'Score', className: 'tabular-nums font-semibold text-danger-600' },
  { key: 'threshold', header: 'Threshold', className: 'tabular-nums' },
  { key: 'atRiskSince', header: 'At risk since', className: 'whitespace-nowrap', render: (r) => formatDateTime(r.atRiskSince) },
]

export default function AdminAtRiskPage() {
  const navigate = useNavigate()
  const [query, setQuery] = useUrlQuery(DEFAULTS)
  const params = useMemo(
    () => ({ sort: AT_RISK_SORT_OPTIONS.some((o) => o.value === query.sort) ? query.sort : DEFAULTS.sort, page: query.page, size: query.size }),
    [query],
  )
  const { items, pageInfo, status, error, reload } = usePagedList(adminLists.atRisk, params)

  return (
    <>
      <PageHeader title="At-risk merchants" description="Stores whose score fell below the at-risk threshold." />
      <FormAlert tone="info" className="mb-4">
        This is an alert only. Nothing happens to these stores automatically; review each one and decide whether to act.
      </FormAlert>
      <Card className="p-4 sm:p-5">
        <Select aria-label="Sort" value={params.sort} onChange={(e) => setQuery({ sort: e.target.value })} options={AT_RISK_SORT_OPTIONS} className="sm:w-60" />
        <div className="mt-4">
          <AsyncContent status={status} error={error} onRetry={reload} isEmpty={items.length === 0} empty={<EmptyState icon={ShieldCheck} title="No stores at risk" />}>
            <Table columns={COLUMNS} rows={items} rowKey="storePublicId" caption="At-risk merchants" onRowClick={(r) => navigate(`/admin/stores/${r.storePublicId}`)} />
            <Pagination
              {...pageInfo}
              sizeOptions={ADMIN_PAGE_SIZE_OPTIONS}
              onPageChange={(page) => setQuery({ page }, { resetPage: false })}
              onSizeChange={(size) => setQuery({ size })}
            />
          </AsyncContent>
        </div>
      </Card>
    </>
  )
}
