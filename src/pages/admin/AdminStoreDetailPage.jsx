import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Info, Package, Store } from 'lucide-react'
import * as adminApi from '@/api/admin'
import { ADMIN_PAGE_SIZE_OPTIONS } from '@/config/constants'
import { METRIC_FIELDS } from '@/config/merchant'
import { useAsync } from '@/hooks/useAsync'
import { usePagedRequest } from '@/hooks/usePagedRequest'
import { usePermissions } from '@/hooks/usePermissions'
import { useUrlQuery } from '@/hooks/useUrlQuery'
import { formatDateTime, formatMoney, humanizeEnum } from '@/utils/format'
import ReviewModeration from '@/components/admin/ReviewModeration'
import StoreLedger from '@/components/admin/StoreLedger'
import UserStatusBadge from '@/components/admin/UserStatusBadge'
import AsyncContent from '@/components/common/AsyncContent'
import PageHeader from '@/components/common/PageHeader'
import SmartImage from '@/components/common/SmartImage'
import MetricTile from '@/components/merchant/MetricTile'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Drawer from '@/components/ui/Drawer'
import EmptyState from '@/components/ui/EmptyState'
import ErrorState from '@/components/ui/ErrorState'
import Pagination from '@/components/ui/Pagination'
import Skeleton from '@/components/ui/Skeleton'
import StatusBadge from '@/components/ui/StatusBadge'
import Table from '@/components/ui/Table'
import Tabs from '@/components/ui/Tabs'

const DEFAULTS = { tab: 'overview' }

function OwnerHelper({ store }) {
  return (
    <div className="flex items-start gap-3 rounded-xl bg-sky-50 p-4 text-sm text-sky-900 dark:bg-sky-500/10 dark:text-sky-200">
      <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      <div>
        <p className="font-semibold">Find the owner account</p>
        <p>
          Store records do not include the owner’s user id, and bans or approvals need that account. Search merchant accounts by the owner’s
          email.
          {store.contactEmail && ` The store’s contact email is ${store.contactEmail}, but it may differ from the account email.`}
        </p>
        <Link to="/admin/users?role=ROLE_MERCHANT" className="mt-1 inline-block font-semibold underline">
          Search merchant accounts
        </Link>
      </div>
    </div>
  )
}

function Overview({ store, publicId }) {
  const score = useAsync(() => adminApi.getStoreScore(publicId), publicId)
  const [paging, setPaging] = useState({ page: 0, size: 20 })
  const events = usePagedRequest((p) => adminApi.listStoreScoreEvents(publicId, p), paging, publicId)
  const rows = [
    ['Slug', store.slug],
    ['City', [store.city, store.district].filter(Boolean).join(', ')],
    ['Contact', [store.contactPhone, store.contactEmail].filter(Boolean).join(' · ')],
    ['Created', store.createdAt && formatDateTime(store.createdAt)],
  ]

  return (
    <div className="space-y-6">
      <OwnerHelper store={store} />
      <Card>
        <Card.Body className="flex flex-wrap items-start gap-4">
          <SmartImage src={store.logoUrl} alt="" name={store.name} className="size-16 rounded-xl" />
          <div className="min-w-0 flex-1 space-y-2 text-sm">
            {store.description && <p className="text-slate-700 dark:text-slate-300">{store.description}</p>}
            <div className="flex flex-wrap gap-2">
              <Badge tone={store.published ? 'success' : 'neutral'}>{store.published ? 'Visible to shoppers' : 'Hidden from shoppers'}</Badge>
              <Badge tone={store.acceptingOrders ? 'success' : 'warning'}>{store.acceptingOrders ? 'Accepting orders' : 'Not accepting orders'}</Badge>
              <Badge tone={store.codEnabled ? 'primary' : 'neutral'}>{store.codEnabled ? 'COD on' : 'COD off'}</Badge>
            </div>
            <dl className="grid gap-2 sm:grid-cols-2">
              {rows
                .filter(([, v]) => v)
                .map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-xs text-slate-500">{label}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
            </dl>
          </div>
        </Card.Body>
      </Card>

      <Card>
        <Card.Header title="Score and metrics" />
        <Card.Body className="pt-3">
          {score.status === 'failed' ? (
            <ErrorState error={score.error} onRetry={score.reload} />
          ) : !score.data ? (
            <Skeleton className="h-40 w-full" />
          ) : (
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {METRIC_FIELDS.map((f) => (
                <MetricTile key={f.key} field={f} value={score.data[f.key]} />
              ))}
            </dl>
          )}
        </Card.Body>
      </Card>

      <Card>
        <Card.Header title="Score history" />
        <Card.Body className="pt-3">
          <AsyncContent status={events.status} error={events.error} onRetry={events.reload} isEmpty={events.items.length === 0} empty={<p className="text-sm text-slate-500">No score changes yet.</p>}>
            <Table
              rowKey={(e) => `${e.type}-${e.createdAt}-${e.orderPublicId}`}
              caption="Score events"
              rows={events.items}
              columns={[
                { key: 'type', header: 'Event', primary: true, render: (e) => humanizeEnum(e.type) },
                { key: 'delta', header: 'Change', className: 'tabular-nums', render: (e) => (Number(e.delta) > 0 ? `+${e.delta}` : e.delta) },
                { key: 'scoreAfter', header: 'Score after', className: 'tabular-nums' },
                { key: 'orderPublicId', header: 'Order', render: (e) => e.orderPublicId ?? '—' },
                { key: 'createdAt', header: 'Date', className: 'whitespace-nowrap', render: (e) => formatDateTime(e.createdAt) },
              ]}
            />
            <Pagination
              {...events.pageInfo}
              sizeOptions={ADMIN_PAGE_SIZE_OPTIONS}
              onPageChange={(page) => setPaging((p) => ({ ...p, page }))}
              onSizeChange={(size) => setPaging({ page: 0, size })}
            />
          </AsyncContent>
        </Card.Body>
      </Card>
    </div>
  )
}

function StoreReviews({ publicId }) {
  const [paging, setPaging] = useState({ page: 0, size: 20 })
  const list = usePagedRequest((p) => adminApi.listStoreReviews(publicId, p), paging, publicId)
  return (
    <Card className="p-4 sm:p-5">
      <ReviewModeration
        kind="store"
        {...list}
        onRetry={list.reload}
        onChanged={list.reload}
        onPageChange={(page) => setPaging((p) => ({ ...p, page }))}
        onSizeChange={(size) => setPaging({ page: 0, size })}
      />
    </Card>
  )
}

// A product's variants and prices (read-only) and its reviews with Hide / Unhide.
function ProductDrawer({ productPublicId, onClose }) {
  const product = useAsync(() => adminApi.getAdminProduct(productPublicId), productPublicId)
  const [paging, setPaging] = useState({ page: 0, size: 20 })
  const reviews = usePagedRequest((p) => adminApi.listProductReviews({ ...p, product: productPublicId }), paging)
  const p = product.data
  return (
    <Drawer open side="right" wide title={p?.name ?? 'Product'} onClose={onClose}>
      <div className="space-y-6 p-4">
        {product.status === 'failed' ? (
          <ErrorState error={product.error} onRetry={product.reload} />
        ) : !p ? (
          <Skeleton className="h-40 w-full" />
        ) : (
          <section className="space-y-2">
            <p className="flex items-center gap-2 text-sm">
              <StatusBadge value={p.status} type="ProductStatus" /> <span className="font-mono text-xs text-slate-500">{p.publicId}</span>
            </p>
            <ul className="divide-y divide-slate-100 text-sm dark:divide-slate-800">
              {(p.variants ?? []).map((v) => (
                <li key={v.publicId} className="flex items-center justify-between gap-3 py-2">
                  <span className="min-w-0">
                    <span className="font-medium">{v.label || Object.values(v.attributes ?? {}).join(' / ') || 'Default'}</span>
                    <span className="block text-xs text-slate-500">SKU {v.sku}</span>
                  </span>
                  <span className="flex items-center gap-2 tabular-nums">
                    {formatMoney(v.effectivePrice ?? v.listPrice)}
                    <StatusBadge value={v.status} type="VariantStatus" />
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
        <section>
          <h3 className="mb-2 text-sm font-semibold text-slate-900 dark:text-white">Product reviews</h3>
          <ReviewModeration
            kind="product"
            {...reviews}
            onRetry={reviews.reload}
            onChanged={reviews.reload}
            onPageChange={(page) => setPaging((x) => ({ ...x, page }))}
            onSizeChange={(size) => setPaging({ page: 0, size })}
          />
        </section>
      </div>
    </Drawer>
  )
}

function StoreProducts({ publicId }) {
  const [paging, setPaging] = useState({ page: 0, size: 20 })
  const [open, setOpen] = useState(null)
  // `store` is REQUIRED on this endpoint; read-only.
  const list = usePagedRequest((p) => adminApi.listAdminProducts({ ...p, store: publicId }), paging, publicId)
  const columns = [
    { key: 'name', header: 'Product', primary: true, render: (p) => <span className="font-medium">{p.name}</span> },
    { key: 'status', header: 'Status', render: (p) => <StatusBadge value={p.status} type="ProductStatus" /> },
    { key: 'variants', header: 'Variants', render: (p) => (p.variantCount != null ? `${p.activeVariantCount ?? 0} of ${p.variantCount} active` : '—') },
    { key: 'price', header: 'From', className: 'tabular-nums', render: (p) => formatMoney(p.minListPrice ?? p.price) },
    {
      key: 'reviews',
      header: <span className="sr-only">Reviews</span>,
      render: (p) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation()
            setOpen(p.publicId)
          }}
        >
          Product reviews
        </Button>
      ),
    },
  ]
  return (
    <Card className="p-4 sm:p-5">
      <AsyncContent status={list.status} error={list.error} onRetry={list.reload} isEmpty={list.items.length === 0} empty={<EmptyState icon={Package} title="No products" />}>
        <Table columns={columns} rows={list.items} caption="Store products" onRowClick={(p) => setOpen(p.publicId)} />
        <Pagination
          {...list.pageInfo}
          sizeOptions={ADMIN_PAGE_SIZE_OPTIONS}
          onPageChange={(page) => setPaging((p) => ({ ...p, page }))}
          onSizeChange={(size) => setPaging({ page: 0, size })}
        />
      </AsyncContent>
      {open && <ProductDrawer key={open} productPublicId={open} onClose={() => setOpen(null)} />}
    </Card>
  )
}

export default function AdminStoreDetailPage() {
  const { publicId } = useParams()
  const { isSuperAdmin } = usePermissions()
  const [query, setQuery] = useUrlQuery(DEFAULTS)
  const { data: store, status, error, reload } = useAsync(() => adminApi.getStore(publicId), publicId)

  if (status === 'failed') {
    return error?.status === 404 ? (
      <EmptyState icon={Store} title="Store not found" action={<Button to="/admin/stores">All stores</Button>} />
    ) : (
      <ErrorState error={error} onRetry={reload} />
    )
  }
  if (!store) return <Skeleton className="h-96 w-full" />

  const tabs = [
    { value: 'overview', label: 'Overview' },
    { value: 'reviews', label: 'Store reviews' },
    { value: 'products', label: 'Products' },
    ...(isSuperAdmin ? [{ value: 'ledger', label: 'Credits and ledger' }] : []),
  ]
  const tab = tabs.some((t) => t.value === query.tab) ? query.tab : 'overview'

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: 'Stores', to: '/admin/stores' }, { label: store.name }]}
        title={store.name}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-mono">{store.publicId}</span> · Owner <UserStatusBadge status={store.ownerStatus} /> · Score {store.score ?? 'n/a'}
          </span>
        }
      />
      <Tabs tabs={tabs} value={tab} onChange={(value) => setQuery({ tab: value }, { replace: true })}>
        {tab === 'overview' && <Overview store={store} publicId={publicId} />}
        {tab === 'reviews' && <StoreReviews publicId={publicId} />}
        {tab === 'products' && <StoreProducts publicId={publicId} />}
        {tab === 'ledger' && isSuperAdmin && <StoreLedger storePublicId={publicId} />}
      </Tabs>
    </>
  )
}
