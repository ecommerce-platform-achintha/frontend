import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Store } from 'lucide-react'
import { adminLists } from '@/store/slices/adminLists'
import { STORE_SORT_OPTIONS } from '@/config/admin'
import { ADMIN_PAGE_SIZE_OPTIONS } from '@/config/constants'
import { usePagedList } from '@/hooks/usePagedList'
import { useUrlQuery } from '@/hooks/useUrlQuery'
import UserStatusBadge from '@/components/admin/UserStatusBadge'
import AsyncContent from '@/components/common/AsyncContent'
import PageHeader from '@/components/common/PageHeader'
import Badge from '@/components/ui/Badge'
import Card from '@/components/ui/Card'
import EmptyState from '@/components/ui/EmptyState'
import Pagination from '@/components/ui/Pagination'
import RatingStars from '@/components/ui/RatingStars'
import SearchInput from '@/components/ui/SearchInput'
import Select from '@/components/ui/Select'
import Table from '@/components/ui/Table'

const DEFAULTS = { q: '', sort: 'name,asc', page: 0, size: 20 }
const yesNo = (value, yes, no) => <Badge tone={value ? 'success' : 'neutral'}>{value ? yes : no}</Badge>

const COLUMNS = [
  {
    key: 'name',
    header: 'Store',
    primary: true,
    render: (s) => (
      <span>
        <span className="font-medium text-slate-900 dark:text-white">{s.name}</span>
        <span className="block font-mono text-xs font-normal text-slate-500">{s.publicId}</span>
      </span>
    ),
  },
  { key: 'ownerStatus', header: 'Owner', render: (s) => <UserStatusBadge status={s.ownerStatus} /> },
  { key: 'published', header: 'Published', render: (s) => yesNo(s.published, 'Visible', 'Hidden') },
  { key: 'acceptingOrders', header: 'Orders', render: (s) => yesNo(s.acceptingOrders, 'Accepting', 'Not accepting') },
  { key: 'codEnabled', header: 'COD', render: (s) => (s.codEnabled ? 'Yes' : 'No') },
  { key: 'rating', header: 'Rating', render: (s) => (s.ratingCount ? <RatingStars value={s.ratingAvg} count={s.ratingCount} /> : '—') },
  { key: 'score', header: 'Score', className: 'tabular-nums', render: (s) => s.score ?? '—' },
]

export default function AdminStoresPage() {
  const navigate = useNavigate()
  const [query, setQuery] = useUrlQuery(DEFAULTS)
  const params = useMemo(
    () => ({
      q: query.q || undefined,
      sort: STORE_SORT_OPTIONS.some((o) => o.value === query.sort) ? query.sort : DEFAULTS.sort,
      page: query.page,
      size: query.size,
    }),
    [query],
  )
  const { items, pageInfo, status, error, reload } = usePagedList(adminLists.stores, params)

  return (
    <>
      <PageHeader title="Stores" description="Every store, including hidden ones." />
      <Card className="p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row">
          <SearchInput value={query.q} onSearch={(q) => setQuery({ q })} placeholder="Store name" className="flex-1" />
          <Select aria-label="Sort stores" value={params.sort} onChange={(e) => setQuery({ sort: e.target.value })} options={STORE_SORT_OPTIONS} className="sm:w-52" />
        </div>
        <div className="mt-4">
          <AsyncContent
            status={status}
            error={error}
            onRetry={reload}
            isEmpty={items.length === 0}
            empty={<EmptyState icon={Store} title="No stores match" />}
          >
            <Table columns={COLUMNS} rows={items} caption="Stores" onRowClick={(s) => navigate(`/admin/stores/${s.publicId}`)} />
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
