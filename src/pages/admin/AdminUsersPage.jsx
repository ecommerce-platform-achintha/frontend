import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users } from 'lucide-react'
import { adminLists } from '@/store/slices/adminLists'
import { ROLE_OPTIONS, USER_SORT_OPTIONS, USER_STATUS_OPTIONS } from '@/config/admin'
import { ADMIN_PAGE_SIZE_OPTIONS } from '@/config/constants'
import { ROLE_LABELS } from '@/config/permissions'
import { usePagedList } from '@/hooks/usePagedList'
import { useUrlQuery } from '@/hooks/useUrlQuery'
import { formatDate } from '@/utils/format'
import UserStatusBadge from '@/components/admin/UserStatusBadge'
import AsyncContent from '@/components/common/AsyncContent'
import PageHeader from '@/components/common/PageHeader'
import Card from '@/components/ui/Card'
import EmptyState from '@/components/ui/EmptyState'
import Pagination from '@/components/ui/Pagination'
import SearchInput from '@/components/ui/SearchInput'
import Select from '@/components/ui/Select'
import Table from '@/components/ui/Table'

const DEFAULTS = { role: '', status: '', q: '', sort: 'createdAt,desc', page: 0, size: 20 }

// NIC is never shown in lists (only on the user detail page).
const COLUMNS = [
  {
    key: 'name',
    header: 'Name',
    primary: true,
    render: (u) => (
      <span>
        <span className="font-medium text-slate-900 dark:text-white">{[u.firstName, u.lastName].filter(Boolean).join(' ') || '—'}</span>
        <span className="block text-xs font-normal text-slate-500 md:hidden">{u.email}</span>
      </span>
    ),
  },
  { key: 'email', header: 'Email', hideOnMobile: true },
  { key: 'role', header: 'Role', render: (u) => ROLE_LABELS[u.role] ?? u.role },
  { key: 'status', header: 'Status', render: (u) => <UserStatusBadge status={u.status} /> },
  { key: 'createdAt', header: 'Created', className: 'whitespace-nowrap', render: (u) => formatDate(u.createdAt) },
]

export default function AdminUsersPage() {
  const navigate = useNavigate()
  const [query, setQuery] = useUrlQuery(DEFAULTS)
  const params = useMemo(
    () => ({
      role: query.role || undefined,
      status: query.status || undefined,
      q: query.q || undefined,
      sort: USER_SORT_OPTIONS.some((o) => o.value === query.sort) ? query.sort : DEFAULTS.sort,
      page: query.page,
      size: query.size,
    }),
    [query],
  )
  const { items, pageInfo, status, error, reload } = usePagedList(adminLists.users, params)

  return (
    <>
      <PageHeader title="Users" description="Every account: customers, merchants, assistants and admins." />
      <Card className="p-4 sm:p-5">
        <div className="grid gap-3 md:grid-cols-[1fr_10rem_11rem_13rem]">
          <SearchInput value={query.q} onSearch={(q) => setQuery({ q })} placeholder="Email, name or USR-… id" />
          <Select aria-label="Role" value={query.role} onChange={(e) => setQuery({ role: e.target.value })} options={ROLE_OPTIONS} placeholder="All roles" />
          <Select aria-label="Status" value={query.status} onChange={(e) => setQuery({ status: e.target.value })} options={USER_STATUS_OPTIONS} placeholder="All statuses" />
          <Select aria-label="Sort users" value={params.sort} onChange={(e) => setQuery({ sort: e.target.value })} options={USER_SORT_OPTIONS} />
        </div>
        <div className="mt-4">
          <AsyncContent
            status={status}
            error={error}
            onRetry={reload}
            isEmpty={items.length === 0}
            empty={<EmptyState icon={Users} title="No users match" description="Try another search or filter." />}
          >
            <Table columns={COLUMNS} rows={items} caption="Users" onRowClick={(u) => navigate(`/admin/users/${u.publicId}`)} />
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
