import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Package, Plus } from 'lucide-react'
import { merchantLists } from '@/store/slices/merchantLists'
import { PAGE_SIZE_OPTIONS } from '@/config/constants'
import { MERCHANT_PRODUCT_SORT_OPTIONS, PRODUCT_TABS } from '@/config/merchant'
import { ACTION_ACCESS } from '@/config/permissions'
import { useMerchantStatus } from '@/hooks/useMerchantStatus'
import { usePagedList } from '@/hooks/usePagedList'
import { usePermissions } from '@/hooks/usePermissions'
import { useUrlQuery } from '@/hooks/useUrlQuery'
import { formatMoney } from '@/utils/format'
import AsyncContent from '@/components/common/AsyncContent'
import PageHeader from '@/components/common/PageHeader'
import PermissionButton from '@/components/common/PermissionButton'
import Card from '@/components/ui/Card'
import EmptyState from '@/components/ui/EmptyState'
import Pagination from '@/components/ui/Pagination'
import RatingStars from '@/components/ui/RatingStars'
import SearchInput from '@/components/ui/SearchInput'
import Select from '@/components/ui/Select'
import StatusBadge from '@/components/ui/StatusBadge'
import Table from '@/components/ui/Table'
import Tabs from '@/components/ui/Tabs'

const DEFAULTS = { tab: 'all', q: '', sort: 'updatedAt,desc', page: 0, size: 20 }

const categoryName = (c) => (c && typeof c === 'object' ? (c.name ?? c.slug) : c) || '—'

function columns(canEdit) {
  const list = [
    { key: 'name', header: 'Product', primary: true, render: (p) => <span className="font-medium text-slate-900 dark:text-white">{p.name}</span> },
    { key: 'category', header: 'Category', hideOnMobile: true, render: (p) => categoryName(p.category) },
    { key: 'status', header: 'Status', render: (p) => <StatusBadge value={p.status} type="ProductStatus" /> },
    { key: 'variants', header: 'Variants', className: 'tabular-nums', render: (p) => `${p.activeVariantCount ?? 0} of ${p.variantCount ?? 0} active` },
    { key: 'minListPrice', header: 'From', className: 'tabular-nums whitespace-nowrap', render: (p) => formatMoney(p.minListPrice) },
    { key: 'stock', header: 'Stock', className: 'tabular-nums', render: (p) => `${p.totalAvailable ?? 0} available · ${p.totalReserved ?? 0} reserved` },
    {
      key: 'rating',
      header: 'Rating',
      hideOnMobile: true,
      render: (p) => (p.ratingCount ? <RatingStars value={p.ratingAvg} count={p.ratingCount} size="sm" /> : '—'),
    },
  ]
  if (canEdit) {
    list.push({
      key: 'actions',
      header: <span className="sr-only">Actions</span>,
      render: (p) => (
        <Link
          to={`/merchant/products/${p.publicId}?tab=edit`}
          onClick={(e) => e.stopPropagation()}
          className="text-sm font-semibold text-primary-700 hover:underline dark:text-primary-300"
        >
          Edit
        </Link>
      ),
    })
  }
  return list
}

export default function MerchantProductsPage() {
  const navigate = useNavigate()
  const { hasAllPerms } = usePermissions()
  const { readOnly } = useMerchantStatus()
  const canEdit = !readOnly && hasAllPerms(ACTION_ACCESS.editProduct)
  const [query, setQuery] = useUrlQuery(DEFAULTS)
  const tab = PRODUCT_TABS.find((t) => t.value === query.tab) ?? PRODUCT_TABS[3]
  const params = useMemo(
    () => ({
      status: tab.value === 'all' ? undefined : tab.value,
      q: query.q || undefined,
      sort: MERCHANT_PRODUCT_SORT_OPTIONS.some((o) => o.value === query.sort) ? query.sort : DEFAULTS.sort,
      page: query.page,
      size: query.size,
    }),
    [tab, query.q, query.sort, query.page, query.size],
  )
  const { items, pageInfo, status, error, reload } = usePagedList(merchantLists.products, params)
  const cols = useMemo(() => columns(canEdit), [canEdit])

  return (
    <>
      <PageHeader
        title="Products"
        description="Your catalog, stock and prices."
        actions={
          <PermissionButton perms={ACTION_ACCESS.editProduct} leftIcon={Plus} onClick={() => navigate('/merchant/products/new')}>
            New product
          </PermissionButton>
        }
      />
      <Card className="p-4 sm:p-5">
        <Tabs tabs={PRODUCT_TABS} value={tab.value} onChange={(value) => setQuery({ tab: value })} />
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <SearchInput value={query.q} onSearch={(q) => setQuery({ q })} placeholder="Search by name" className="flex-1" />
          <Select
            aria-label="Sort products"
            value={params.sort}
            onChange={(e) => setQuery({ sort: e.target.value })}
            options={MERCHANT_PRODUCT_SORT_OPTIONS}
            className="sm:w-52"
          />
        </div>
        <div className="mt-4">
          <AsyncContent
            status={status}
            error={error}
            onRetry={reload}
            isEmpty={items.length === 0}
            empty={
              <EmptyState
                icon={Package}
                title={query.q ? 'No products match' : 'No products here'}
                description={query.q ? 'Try another name.' : 'Products you create start as drafts.'}
                action={
                  !query.q && (
                    <PermissionButton perms={ACTION_ACCESS.editProduct} leftIcon={Plus} onClick={() => navigate('/merchant/products/new')}>
                      New product
                    </PermissionButton>
                  )
                }
              />
            }
          >
            <Table columns={cols} rows={items} caption="Products" onRowClick={(p) => navigate(`/merchant/products/${p.publicId}`)} />
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
