import { useMemo, useState } from 'react'
import { Pencil, Percent, Plus, Trash2 } from 'lucide-react'
import * as catalogApi from '@/api/catalog'
import { merchantLists } from '@/store/slices/merchantLists'
import { PAGE_SIZE_OPTIONS } from '@/config/constants'
import { errorMessage } from '@/config/errorMessages'
import { DISCOUNT_SORT } from '@/config/merchant'
import { useMerchantStatus } from '@/hooks/useMerchantStatus'
import { usePagedList } from '@/hooks/usePagedList'
import { useToast } from '@/hooks/useToast'
import { useUrlQuery } from '@/hooks/useUrlQuery'
import { formatDateTime, formatMoney } from '@/utils/format'
import AsyncContent from '@/components/common/AsyncContent'
import PageHeader from '@/components/common/PageHeader'
import ProductPicker from '@/components/merchant/ProductPicker'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import EmptyState from '@/components/ui/EmptyState'
import IconButton from '@/components/ui/IconButton'
import Pagination from '@/components/ui/Pagination'
import Table from '@/components/ui/Table'
import DiscountForm from './DiscountForm'

const DEFAULTS = { product: '', page: 0, size: 20 }

const valueText = (d) => (d.type === 'PERCENT' ? `${d.value}% off` : `${formatMoney(d.value)} off`)
const windowText = (d) => {
  if (!d.startsAt && !d.endsAt) return 'No dates set'
  return `${d.startsAt ? formatDateTime(d.startsAt) : 'No start'} – ${d.endsAt ? formatDateTime(d.endsAt) : 'no end'}`
}

export default function MerchantDiscountsPage() {
  const toast = useToast()
  const { readOnly } = useMerchantStatus()
  const [query, setQuery] = useUrlQuery(DEFAULTS)
  const [editing, setEditing] = useState(null) // null | 'new' | discount
  const [deleting, setDeleting] = useState(null)
  const [deleteError, setDeleteError] = useState('')
  const params = useMemo(() => ({ product: query.product || undefined, sort: DISCOUNT_SORT, page: query.page, size: query.size }), [query])
  const { items, pageInfo, status, error, reload } = usePagedList(merchantLists.discounts, params)

  const columns = [
    {
      key: 'name',
      header: 'Discount',
      primary: true,
      render: (d) => (
        <span>
          <span className="font-medium text-slate-900 dark:text-white">{d.name || valueText(d)}</span>
          <span className="block text-xs font-normal text-slate-500">
            {d.scope === 'VARIANT' ? `Variant ${d.variantPublicId}` : `Product ${d.productName ?? d.productPublicId}`}
          </span>
        </span>
      ),
    },
    { key: 'value', header: 'Value', className: 'whitespace-nowrap', render: valueText },
    { key: 'window', header: 'When (Sri Lanka time)', render: windowText },
    {
      key: 'state',
      header: 'State',
      render: (d) => (
        <span className="flex flex-wrap gap-1">
          {d.live ? <Badge tone="success">Live now</Badge> : <Badge>Not live</Badge>}
          {d.active === false && <Badge tone="warning">Paused</Badge>}
        </span>
      ),
    },
  ]
  if (!readOnly) {
    columns.push({
      key: 'actions',
      header: <span className="sr-only">Actions</span>,
      render: (d) => (
        <span className="flex gap-1">
          <IconButton icon={Pencil} label={`Edit ${d.name || 'discount'}`} size="sm" onClick={() => setEditing(d)} />
          <IconButton icon={Trash2} label={`Delete ${d.name || 'discount'}`} size="sm" variant="danger" onClick={() => setDeleting(d)} />
        </span>
      ),
    })
  }

  const remove = async () => {
    setDeleteError('')
    try {
      await catalogApi.deleteDiscount(deleting.publicId)
      setDeleting(null)
      toast.success('Discount deleted.')
      if (items.length === 1 && query.page > 0) setQuery({ page: query.page - 1 }, { resetPage: false })
      else reload()
    } catch (err) {
      setDeleteError(errorMessage(err))
      throw err
    }
  }

  return (
    <>
      <PageHeader
        title="Discounts"
        description="Lower prices for a product or one variant, for a time window."
        actions={
          !readOnly && (
            <Button leftIcon={Plus} onClick={() => setEditing('new')}>
              New discount
            </Button>
          )
        }
      />
      <Card className="p-4 sm:p-5">
        <div className="max-w-xl">
          <ProductPicker value={query.product} onChange={(product) => setQuery({ product })} emptyLabel="All products" />
        </div>
        <div className="mt-4">
          <AsyncContent
            status={status}
            error={error}
            onRetry={reload}
            isEmpty={items.length === 0}
            empty={<EmptyState icon={Percent} title="No discounts" description="Only the single best discount applies to an item; discounts do not stack." />}
          >
            <Table columns={columns} rows={items} caption="Discounts" />
            <Pagination
              {...pageInfo}
              sizeOptions={PAGE_SIZE_OPTIONS}
              onPageChange={(page) => setQuery({ page }, { resetPage: false })}
              onSizeChange={(size) => setQuery({ size })}
            />
          </AsyncContent>
        </div>
      </Card>

      {editing !== null && (
        <DiscountForm
          discount={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={(message) => {
            setEditing(null)
            toast.success(message)
            reload()
          }}
        />
      )}
      <ConfirmDialog
        open={deleting !== null}
        title="Delete this discount?"
        message="Prices go back to normal right away. This cannot be undone."
        confirmLabel="Delete"
        tone="danger"
        error={deleteError}
        onConfirm={remove}
        onCancel={() => {
          setDeleting(null)
          setDeleteError('')
        }}
      />
    </>
  )
}
