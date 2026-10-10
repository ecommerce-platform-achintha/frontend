import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, BadgeCheck, CircleCheck, CircleDashed, ClipboardList, Package, Truck, Wallet } from 'lucide-react'
import * as catalogApi from '@/api/catalog'
import * as ordersApi from '@/api/orders'
import * as storesApi from '@/api/stores'
import * as usersApi from '@/api/users'
import { DASHBOARD_METRICS, METRIC_FIELDS } from '@/config/merchant'
import { filterNav, MERCHANT_NAV } from '@/config/navigation'
import { PERMS } from '@/config/permissions'
import { useAsync } from '@/hooks/useAsync'
import { useMerchantStatus } from '@/hooks/useMerchantStatus'
import { usePermissions } from '@/hooks/usePermissions'
import { cn } from '@/utils/cn'
import PageHeader from '@/components/common/PageHeader'
import MetricTile from '@/components/merchant/MetricTile'
import { LateFlags } from '@/components/orders/OrderParts'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import ErrorState from '@/components/ui/ErrorState'
import Skeleton from '@/components/ui/Skeleton'

// ---------------------------------------------------------------------------
// Owner: setup checklist, computed from real calls
// ---------------------------------------------------------------------------

const total = (page) => page?.totalElements ?? 0

async function loadSetup() {
  // Each check is independent: one failure must not hide the others.
  const [store, banks, couriers, products, activeProducts, assistants] = await Promise.allSettled([
    storesApi.getMyStore(),
    storesApi.listBankAccounts({ size: 1 }),
    storesApi.listMyCouriers(),
    catalogApi.listMerchantProducts({ size: 1 }),
    catalogApi.listMerchantProducts({ status: 'ACTIVE', size: 1 }),
    usersApi.listAssistants({ size: 1 }),
  ])
  // GET /api/merchant/store is a 404 until the profile is first saved: that means "not done", not an error.
  const storeValue = store.status === 'fulfilled' ? store.value : store.reason?.status === 404 ? null : undefined
  const ok = (r, fn) => (r.status === 'fulfilled' ? fn(r.value) : undefined) // undefined = could not check
  return {
    store: storeValue,
    profile: storeValue === undefined ? undefined : Boolean(storeValue),
    bank: ok(banks, (p) => total(p) > 0),
    courier: ok(couriers, (list) => Array.isArray(list) && list.some((c) => c.active !== false)),
    // The contract has no "not chosen yet" state for COD: it counts once the profile exists (the switch then has a value).
    cod: storeValue === undefined ? undefined : typeof storeValue?.codEnabled === 'boolean',
    product: ok(products, (p) => total(p) > 0),
    activeProduct: ok(activeProducts, (p) => total(p) > 0),
    assistants: ok(assistants, (p) => total(p) > 0),
  }
}

function SetupChecklist({ isPending }) {
  const { data, status, error, reload } = useAsync(loadSetup, 'setup')
  if (status === 'loading') return <Skeleton className="h-72 w-full" />
  if (status === 'failed') return <ErrorState error={error} onRetry={reload} />

  const items = [
    { key: 'profile', label: 'Save your store profile', to: '/merchant/store', required: true },
    { key: 'bank', label: 'Add a bank account for transfers', to: '/merchant/bank-accounts', required: true },
    { key: 'courier', label: 'Enable at least one courier', to: '/merchant/shipping', required: true },
    {
      key: 'cod',
      label:
        data.store && typeof data.store.codEnabled === 'boolean'
          ? `Choose cash on delivery (currently ${data.store.codEnabled ? 'on' : 'off'})`
          : 'Choose whether you accept cash on delivery',
      to: '/merchant/store',
      required: true,
    },
    { key: 'product', label: 'Create your first product', to: '/merchant/products/new', required: true },
    {
      key: 'activeProduct',
      label: 'Make a product live',
      hint: isPending ? 'Possible after your account is approved.' : undefined,
      to: '/merchant/products?tab=DRAFT',
      required: true,
    },
    { key: 'assistants', label: 'Add assistants (optional)', to: '/merchant/assistants', required: false },
  ]
  const requiredDone = items.filter((i) => i.required).every((i) => data[i.key] === true)
  if (requiredDone) return null
  const doneCount = items.filter((i) => data[i.key] === true).length

  return (
    <Card>
      <Card.Header
        title="Set up your store"
        description={`${doneCount} of ${items.length} done. Customers can order once your products are live.`}
        actions={
          <Button variant="ghost" size="sm" onClick={reload}>
            Check again
          </Button>
        }
      />
      <Card.Body className="pt-3">
        <ol className="divide-y divide-slate-100 dark:divide-slate-800">
          {items.map((item) => {
            const state = data[item.key]
            return (
              <li key={item.key}>
                <Link to={item.to} className="group flex items-center gap-3 py-3 text-sm">
                  {state === true ? (
                    <CircleCheck aria-hidden="true" className="size-5 shrink-0 text-success-600 dark:text-success-400" />
                  ) : (
                    <CircleDashed aria-hidden="true" className="size-5 shrink-0 text-slate-400" />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className={cn('font-medium', state === true ? 'text-slate-500 line-through dark:text-slate-400' : 'text-slate-900 dark:text-white')}>
                      {item.label}
                    </span>
                    <span className="sr-only">{state === true ? ' (done)' : ' (to do)'}</span>
                    {item.hint && state !== true && <span className="block text-xs text-slate-500 dark:text-slate-400">{item.hint}</span>}
                    {state === undefined && <span className="block text-xs text-warning-700 dark:text-warning-400">Could not check this right now.</span>}
                  </span>
                  <ArrowRight aria-hidden="true" className="size-4 text-slate-400 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </li>
            )
          })}
        </ol>
      </Card.Body>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Work to do (needs ORDER_VIEW): counts from `totalElements`
// ---------------------------------------------------------------------------

const WORK_CARDS = [
  { tab: 'quote', status: 'AWAITING_MERCHANT', label: 'Needs a quote', icon: ClipboardList },
  { tab: 'verify', status: 'PAYMENT_SUBMITTED', label: 'Payments to verify', icon: Wallet },
  { tab: 'ship', status: 'READY_TO_SHIP', label: 'Ready to ship', icon: Package },
  { tab: 'shipped', status: 'SHIPPED', label: 'Shipped', icon: Truck },
]
// Late flags can only be set on these; load a few rows (soonest deadline first) to surface them.
const LATE_FLAG_ROWS = { PAYMENT_SUBMITTED: 10, READY_TO_SHIP: 10 }

async function loadWork() {
  const pages = await Promise.all(
    WORK_CARDS.map((c) => ordersApi.listMerchantOrders({ status: [c.status], size: LATE_FLAG_ROWS[c.status] ?? 1, sort: 'deadlineAt,asc' })),
  )
  const late = pages
    .flatMap((p) => p?.content ?? [])
    .filter((o) => o.flags?.lateShipment || o.flags?.lateVerification)
  return { counts: pages.map(total), late }
}

function WorkToDo() {
  const { data, status, error, reload } = useAsync(loadWork, 'work')
  return (
    <section aria-labelledby="work-title" className="space-y-3">
      <h2 id="work-title" className="text-lg font-semibold text-slate-900 dark:text-white">
        Work to do
      </h2>
      {status === 'failed' ? (
        <Card>
          <ErrorState error={error} onRetry={reload} />
        </Card>
      ) : (
        <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {WORK_CARDS.map((card, i) => {
            const Icon = card.icon
            const count = data?.counts[i]
            return (
              <li key={card.tab}>
                <Link
                  to={`/merchant/orders?tab=${card.tab}`}
                  className="flex h-full flex-col gap-2 rounded-[var(--radius-card)] border border-slate-200/70 bg-white p-4 shadow-card transition-colors hover:border-primary-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-primary-500/50"
                >
                  <Icon aria-hidden="true" className="size-5 text-primary-600 dark:text-primary-400" />
                  <span className="text-sm text-slate-600 dark:text-slate-300">{card.label}</span>
                  {status === 'loading' ? (
                    <Skeleton className="h-8 w-12" />
                  ) : (
                    <span className={cn('text-2xl font-bold tabular-nums', count > 0 ? 'text-slate-900 dark:text-white' : 'text-slate-400')}>{count}</span>
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      )}
      {data?.late.length > 0 && (
        <Card>
          <Card.Header title="Late orders" description="These missed a store deadline. Handle them first." />
          <Card.Body className="pt-3">
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {data.late.map((o) => (
                <li key={o.publicId}>
                  <Link to={`/merchant/orders/${o.publicId}`} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm hover:text-primary-700 dark:hover:text-primary-300">
                    <span className="font-medium">{o.publicId}</span>
                    <LateFlags flags={o.flags} />
                  </Link>
                </li>
              ))}
            </ul>
          </Card.Body>
        </Card>
      )}
    </section>
  )
}

// ---------------------------------------------------------------------------
// Owner: metrics
// ---------------------------------------------------------------------------

function MetricsCard() {
  const { data, status, error, reload } = useAsync(() => storesApi.getMyMetrics(), 'metrics')
  const fields = METRIC_FIELDS.filter((f) => DASHBOARD_METRICS.includes(f.key))
  return (
    <Card>
      <Card.Header
        title="Performance"
        actions={
          <Button to="/merchant/metrics" variant="ghost" size="sm" rightIcon={ArrowRight}>
            All metrics
          </Button>
        }
      />
      <Card.Body className="pt-3">
        {status === 'failed' ? (
          <ErrorState error={error} onRetry={reload} />
        ) : status === 'loading' ? (
          <Skeleton className="h-40 w-full" />
        ) : (
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {fields.map((f) => (
              <MetricTile key={f.key} field={f} value={data?.[f.key]} />
            ))}
          </dl>
        )}
      </Card.Body>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Assistants without ORDER_VIEW: quick links to the pages they can use
// ---------------------------------------------------------------------------

function QuickLinks() {
  const { can } = usePermissions()
  const links = useMemo(
    () =>
      filterNav(MERCHANT_NAV, can)
        .flatMap((g) => g.items)
        .filter((i) => i.to !== '/merchant'),
    [can],
  )
  if (!links.length) {
    return (
      <Card className="p-6 text-sm text-slate-600 dark:text-slate-300">
        Your account has no pages to open yet. Ask the store owner to give you the permissions you need.
      </Card>
    )
  }
  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {links.map(({ to, label, icon: Icon }) => (
        <li key={to}>
          <Link
            to={to}
            className="flex items-center gap-3 rounded-[var(--radius-card)] border border-slate-200/70 bg-white p-4 text-sm font-medium shadow-card hover:border-primary-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-primary-500/50"
          >
            <Icon aria-hidden="true" className="size-5 text-primary-600 dark:text-primary-400" />
            {label}
            <ArrowRight aria-hidden="true" className="ml-auto size-4 text-slate-400" />
          </Link>
        </li>
      ))}
    </ul>
  )
}

export default function MerchantDashboardPage() {
  const { isOwner, hasPerm } = usePermissions()
  const { isPending, readOnly } = useMerchantStatus()
  const canViewOrders = hasPerm(PERMS.ORDER_VIEW)

  return (
    <>
      <PageHeader
        title="Dashboard"
        description={isOwner ? 'Your store at a glance.' : 'What needs your attention.'}
      />
      <div className="space-y-8">
        {isOwner && !readOnly && <SetupChecklist isPending={isPending} />}
        {canViewOrders && <WorkToDo />}
        {isOwner && <MetricsCard />}
        {!canViewOrders && (
          <section aria-labelledby="links-title" className="space-y-3">
            <h2 id="links-title" className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white">
              <BadgeCheck aria-hidden="true" className="size-5 text-primary-600" />
              Your pages
            </h2>
            <QuickLinks />
          </section>
        )}
      </div>
    </>
  )
}
