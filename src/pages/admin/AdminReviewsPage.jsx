import { useState } from 'react'
import * as adminApi from '@/api/admin'
import { useUrlQuery } from '@/hooks/useUrlQuery'
import { usePagedRequest } from '@/hooks/usePagedRequest'
import { isPublicId, normalizePublicId } from '@/utils/ids'
import ReviewModeration from '@/components/admin/ReviewModeration'
import StorePicker from '@/components/admin/StorePicker'
import PageHeader from '@/components/common/PageHeader'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import FormField from '@/components/ui/FormField'
import Input from '@/components/ui/Input'
import Tabs from '@/components/ui/Tabs'

const DEFAULTS = { mode: 'store', store: '', product: '', page: 0, size: 20 }
const MODES = [
  { value: 'store', label: 'Store reviews' },
  { value: 'product', label: 'Product reviews' },
]

function ProductIdForm({ value, onSubmit }) {
  const [text, setText] = useState(value)
  const [error, setError] = useState('')
  const submit = (event) => {
    event.preventDefault()
    const id = normalizePublicId(text)
    if (!isPublicId(id, 'ITM')) return setError('Paste a product id like ITM-2610-7K2M9Q.')
    setError('')
    onSubmit(id)
  }
  return (
    <form onSubmit={submit} noValidate className="flex items-end gap-2">
      <FormField label="Product id" error={error} className="flex-1" hint="Find it on the product page, or in a store’s Products tab.">
        <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="ITM-…" spellCheck={false} />
      </FormField>
      <Button type="submit" className={error ? 'mb-6' : 'mb-5'}>
        Show reviews
      </Button>
    </form>
  )
}

export default function AdminReviewsPage() {
  const [query, setQuery] = useUrlQuery(DEFAULTS)
  const mode = query.mode === 'product' ? 'product' : 'store'
  const storeId = isPublicId(query.store, 'STR') ? query.store : null
  const productId = isPublicId(query.product, 'ITM') ? query.product : null
  const paging = { page: query.page, size: query.size }

  const storeList = usePagedRequest((p) => adminApi.listStoreReviews(storeId, p), mode === 'store' && storeId ? paging : null, storeId)
  // `product` is REQUIRED on GET /api/admin/reviews.
  const productList = usePagedRequest((p) => adminApi.listProductReviews(p), mode === 'product' && productId ? { ...paging, product: productId } : null)
  const list = mode === 'store' ? storeList : productList
  const chosen = mode === 'store' ? storeId : productId

  return (
    <>
      <PageHeader title="Reviews" description="Hide reviews that break the rules, or show them again. Hidden reviews keep your reason." />
      <Card className="space-y-4 p-4 sm:p-5">
        <Tabs tabs={MODES} value={mode} onChange={(value) => setQuery({ mode: value })} />
        {mode === 'store' ? (
          <StorePicker selectedId={storeId} onSelect={(s) => setQuery({ store: s.publicId })} />
        ) : (
          <ProductIdForm value={query.product} onSubmit={(id) => setQuery({ product: id })} />
        )}
      </Card>
      {chosen && (
        <Card className="mt-6 p-4 sm:p-5">
          <h2 className="mb-4 text-sm font-semibold text-slate-900 dark:text-white">
            Reviews for <span className="font-mono">{chosen}</span>
          </h2>
          <ReviewModeration
            kind={mode}
            {...list}
            onRetry={list.reload}
            onChanged={list.reload}
            onPageChange={(page) => setQuery({ page }, { resetPage: false })}
            onSizeChange={(size) => setQuery({ size })}
          />
        </Card>
      )}
    </>
  )
}
