import { useState } from 'react'
import * as catalogApi from '@/api/catalog'
import { useAsync } from '@/hooks/useAsync'
import { useDebounce } from '@/hooks/useDebounce'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'

const PICKER_SIZE = 50 // user-facing lists cap at 50

/**
 * Picks one of the store's own products (GET /api/merchant/products): a name filter plus a select.
 * value: product publicId ('' for none). onChange(publicId).
 * `emptyLabel` is the text of the empty option ("All products" for filters, "Choose a product" in forms).
 */
export default function ProductPicker({ value, onChange, emptyLabel = 'Choose a product', invalid, id, 'aria-describedby': describedBy }) {
  const [text, setText] = useState('')
  const q = useDebounce(text.trim(), 300)
  const { data, status } = useAsync(() => catalogApi.listMerchantProducts({ q: q || undefined, size: PICKER_SIZE, sort: 'name,asc' }), `products:${q}`)
  const products = data?.content ?? []
  // Keep the chosen product selectable even when the name filter hides it.
  const hasValue = !value || products.some((p) => p.publicId === value)

  return (
    <div className="grid gap-2 sm:grid-cols-[minmax(0,12rem)_1fr]">
      <Input type="search" value={text} onChange={(e) => setText(e.target.value)} placeholder="Filter by name" aria-label="Filter products by name" />
      <Select id={id} aria-describedby={describedBy} invalid={invalid} value={value} onChange={(e) => onChange(e.target.value)} disabled={status === 'loading' && !data}>
        <option value="">{status === 'loading' && !data ? 'Loading products…' : emptyLabel}</option>
        {!hasValue && <option value={value}>{value}</option>}
        {products.map((p) => (
          <option key={p.publicId} value={p.publicId}>
            {p.name}
            {p.status !== 'ACTIVE' ? ` (${p.status.toLowerCase()})` : ''}
          </option>
        ))}
      </Select>
    </div>
  )
}
