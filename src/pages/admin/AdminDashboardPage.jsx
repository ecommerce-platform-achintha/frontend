import { Link } from 'react-router-dom'
import { CalendarDays, Ban, Flag, MessageSquareWarning, RefreshCw, Settings, ShieldAlert, ShoppingBag, UserCheck } from 'lucide-react'
import * as adminApi from '@/api/admin'
import { useAsync } from '@/hooks/useAsync'
import { usePermissions } from '@/hooks/usePermissions'
import { cn } from '@/utils/cn'
import PageHeader from '@/components/common/PageHeader'
import Skeleton from '@/components/ui/Skeleton'

// No statistics endpoint exists: every count is a list call with size=1 reading totalElements.
const CARDS = [
  { key: 'pending', label: 'Merchants waiting for approval', icon: UserCheck, to: '/admin/merchants/pending', load: () => adminApi.listPendingMerchants({ size: 1 }) },
  { key: 'atRisk', label: 'At-risk merchants', icon: ShieldAlert, to: '/admin/at-risk', load: () => adminApi.listAtRiskMerchants({ size: 1 }) },
  {
    key: 'complaints',
    label: 'Open complaints',
    icon: MessageSquareWarning,
    to: '/admin/complaints?status=OPEN&status=UNDER_REVIEW',
    load: () => adminApi.listComplaints({ status: ['OPEN', 'UNDER_REVIEW'], size: 1 }),
  },
  { key: 'flags', label: 'Flagged payment references', icon: Flag, to: '/admin/flagged-references?status=OPEN', load: () => adminApi.listFlaggedReferences({ status: 'OPEN', size: 1 }) },
  { key: 'cod', label: 'Open COD objections', icon: Ban, to: '/admin/cod-objections?status=OPEN', load: () => adminApi.listCodObjections({ status: 'OPEN', size: 1 }) },
  {
    key: 'resolve',
    label: 'Orders needing resolution',
    icon: ShoppingBag,
    to: '/admin/orders?needsResolution=true',
    load: () => adminApi.listOrders({ needsResolution: true, size: 1 }),
  },
]

const cardClass =
  'flex h-full flex-col gap-2 rounded-[var(--radius-card)] border border-slate-200/70 bg-white p-4 shadow-card transition-colors hover:border-primary-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-primary-500/50'

// Each card loads on its own, with its own skeleton and error.
function CountCard({ card }) {
  const { data, status, reload } = useAsync(card.load, card.key)
  const Icon = card.icon
  const count = data?.totalElements ?? 0
  return (
    <li>
      {status === 'failed' ? (
        <div className={cn(cardClass, 'hover:border-slate-200')}>
          <Icon aria-hidden="true" className="size-5 text-slate-400" />
          <span className="text-sm text-slate-600 dark:text-slate-300">{card.label}</span>
          <button type="button" onClick={reload} className="flex items-center gap-1.5 text-sm font-semibold text-danger-600 hover:underline">
            <RefreshCw aria-hidden="true" className="size-4" /> Could not load. Retry
          </button>
        </div>
      ) : (
        <Link to={card.to} className={cardClass}>
          <Icon aria-hidden="true" className="size-5 text-primary-600 dark:text-primary-400" />
          <span className="text-sm text-slate-600 dark:text-slate-300">{card.label}</span>
          {status === 'succeeded' ? (
            <span className={cn('text-2xl font-bold tabular-nums', count > 0 ? 'text-slate-900 dark:text-white' : 'text-slate-400')}>{count}</span>
          ) : (
            <Skeleton className="h-8 w-12" />
          )}
        </Link>
      )}
    </li>
  )
}

export default function AdminDashboardPage() {
  const { isSuperAdmin } = usePermissions()
  return (
    <>
      <PageHeader title="Dashboard" description="What needs the marketplace team’s attention." />
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {CARDS.map((card) => (
          <CountCard key={card.key} card={card} />
        ))}
      </ul>
      {isSuperAdmin && (
        <section aria-labelledby="quick" className="mt-8">
          <h2 id="quick" className="mb-3 text-lg font-semibold text-slate-900 dark:text-white">
            Super admin
          </h2>
          <div className="flex flex-wrap gap-3">
            <Link to="/admin/settings" className={cn(cardClass, 'flex-row items-center')}>
              <Settings aria-hidden="true" className="size-5 text-primary-600" /> Settings
            </Link>
            <Link to="/admin/holidays" className={cn(cardClass, 'flex-row items-center')}>
              <CalendarDays aria-hidden="true" className="size-5 text-primary-600" /> Holidays
            </Link>
          </div>
        </section>
      )}
    </>
  )
}
