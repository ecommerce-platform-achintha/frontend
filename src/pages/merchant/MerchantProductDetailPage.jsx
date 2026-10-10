import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { PackageX, SlidersHorizontal } from 'lucide-react'
import * as catalogApi from '@/api/catalog'
import { ACTION_ACCESS } from '@/config/permissions'
import { useAsync } from '@/hooks/useAsync'
import { useMerchantStatus } from '@/hooks/useMerchantStatus'
import { usePermissions } from '@/hooks/usePermissions'
import { useToast } from '@/hooks/useToast'
import { useUrlQuery } from '@/hooks/useUrlQuery'
import { formatDateTime, formatMoney } from '@/utils/format'
import PageHeader from '@/components/common/PageHeader'
import PermissionButton from '@/components/common/PermissionButton'
import SmartImage from '@/components/common/SmartImage'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import EmptyState from '@/components/ui/EmptyState'
import ErrorState from '@/components/ui/ErrorState'
import Skeleton from '@/components/ui/Skeleton'
import StatusBadge from '@/components/ui/StatusBadge'
import Table from '@/components/ui/Table'
import Tabs from '@/components/ui/Tabs'
import ProductForm from './product/ProductForm'
import ProductStatusActions from './product/ProductStatusActions'
import StockEditor from './product/StockEditor'

const DEFAULTS = { tab: 'overview' }
const looksLikeProduct = (data, publicId) => data && typeof data === 'object' && data.publicId === publicId && Array.isArray(data.variants)

const variantName = (v) =>
  v.label ||
  Object.values(v.attributes ?? {})
    .filter(Boolean)
    .join(' / ') ||
  'Default'

function VariantsTable({ product, onEditStock }) {
  const columns = [
    {
      key: 'label',
      header: 'Variant',
      primary: true,
      render: (v) => (
        <span>
          <span className="font-medium text-slate-900 dark:text-white">{variantName(v)}</span>
          <span className="block text-xs font-normal text-slate-500">SKU {v.sku}</span>
        </span>
      ),
    },
    { key: 'status', header: 'Status', render: (v) => <StatusBadge value={v.status} type="VariantStatus" /> },
    {
      key: 'price',
      header: 'Price',
      className: 'tabular-nums whitespace-nowrap',
      render: (v) => (
        <span>
          {formatMoney(v.effectivePrice ?? v.listPrice)}
          {v.discount && Number(v.effectivePrice) < Number(v.listPrice) && (
            <span className="ml-1.5 text-xs text-slate-400 line-through">{formatMoney(v.listPrice)}</span>
          )}
        </span>
      ),
    },
    { key: 'available', header: 'Available', className: 'tabular-nums', render: (v) => v.stock?.quantityAvailable ?? '—' },
    { key: 'reserved', header: 'Reserved', className: 'tabular-nums', render: (v) => v.stock?.reservedQuantity ?? '—' },
    {
      key: 'stockAction',
      header: <span className="sr-only">Stock</span>,
      render: (v) => (
        <PermissionButton perms={ACTION_ACCESS.editStock} variant="outline" size="sm" leftIcon={SlidersHorizontal} onClick={() => onEditStock(v.publicId)}>
          Stock
        </PermissionButton>
      ),
    },
  ]
  return <Table columns={columns} rows={product.variants ?? []} caption="Variants" />
}

function Overview({ product, onEditStock }) {
  const images = product.imageUrls?.length ? product.imageUrls : (product.imageKeys ?? []).map(() => null)
  return (
    <div className="space-y-6">
      <Card>
        <Card.Header title="Variants and stock" description="Reserved units belong to open orders." />
        <Card.Body className="pt-3">
          <VariantsTable product={product} onEditStock={onEditStock} />
        </Card.Body>
      </Card>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <Card.Header title="Details" />
          <Card.Body className="space-y-3 text-sm">
            <p className="whitespace-pre-line text-slate-700 dark:text-slate-300">{product.description || 'No description.'}</p>
            <div className="flex flex-wrap gap-2">
              <Badge tone={product.codAllowed ? 'success' : 'neutral'}>{product.codAllowed ? 'Cash on delivery allowed' : 'No cash on delivery'}</Badge>
              {(product.options ?? []).map((o) => (
                <Badge key={o.name} tone="info">
                  {o.name}: {(o.values ?? []).join(', ')}
                </Badge>
              ))}
            </div>
            {product.updatedAt && <p className="text-xs text-slate-500">Last updated {formatDateTime(product.updatedAt)}</p>}
          </Card.Body>
        </Card>
        <Card>
          <Card.Header title="Images" />
          <Card.Body>
            {images.length ? (
              <ul className="grid grid-cols-4 gap-2">
                {images.map((url, i) => (
                  <li key={url ?? i}>
                    <SmartImage src={url} alt={`${product.name} image ${i + 1}`} name={product.name} className="aspect-square rounded-lg" />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500">No images.</p>
            )}
          </Card.Body>
        </Card>
      </div>
    </div>
  )
}

export default function MerchantProductDetailPage() {
  const { publicId } = useParams()
  const toast = useToast()
  const { hasAllPerms } = usePermissions()
  const { readOnly } = useMerchantStatus()
  const [query, setQuery] = useUrlQuery(DEFAULTS)
  const [stockFor, setStockFor] = useState(null) // variant publicId
  const { data: product, status, error, reload, setData } = useAsync(() => catalogApi.getMerchantProduct(publicId), publicId)

  const canEdit = !readOnly && hasAllPerms(ACTION_ACCESS.editProduct)
  // Replace with the response when it is the product; otherwise read it again.
  const applySaved = (saved) => (looksLikeProduct(saved, publicId) ? setData(saved) : reload())
  const reloadNow = async () => {
    const fresh = await catalogApi.getMerchantProduct(publicId)
    setData(fresh)
    return fresh
  }

  if (!product) {
    if (status === 'failed') {
      return error?.status === 404 ? (
        <EmptyState icon={PackageX} title="Product not found" action={<Button to="/merchant/products">All products</Button>} />
      ) : (
        <ErrorState error={error} onRetry={reload} />
      )
    }
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  const tabs = [{ value: 'overview', label: 'Overview and stock' }, ...(canEdit ? [{ value: 'edit', label: 'Edit details' }] : [])]
  const tab = tabs.some((t) => t.value === query.tab) ? query.tab : 'overview'
  const stockVariant = product.variants?.find((v) => v.publicId === stockFor)

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: 'Products', to: '/merchant/products' }, { label: product.name }]}
        title={
          <span className="flex flex-wrap items-center gap-3">
            {product.name}
            <StatusBadge value={product.status} type="ProductStatus" className="text-sm" />
          </span>
        }
        description={product.publicId}
        actions={<ProductStatusActions product={product} onChanged={(saved) => applySaved(saved)} />}
      />
      <Tabs tabs={tabs} value={tab} onChange={(value) => setQuery({ tab: value }, { replace: true })}>
        {tab === 'edit' ? (
          <ProductForm
            key={product.version ?? product.updatedAt}
            product={product}
            submitLabel="Save changes"
            onSubmit={async (body) => {
              const saved = await catalogApi.updateProduct(publicId, body)
              toast.success('Product saved.')
              applySaved(saved)
              setQuery({ tab: 'overview' }, { replace: true })
            }}
            onCancel={() => setQuery({ tab: 'overview' }, { replace: true })}
          />
        ) : (
          <Overview product={product} onEditStock={setStockFor} />
        )}
      </Tabs>
      {stockVariant && (
        <StockEditor
          variant={stockVariant}
          onClose={() => setStockFor(null)}
          onReload={reloadNow}
          onSaved={() => {
            setStockFor(null)
            toast.success('Stock updated.')
            reload()
          }}
        />
      )}
    </>
  )
}
