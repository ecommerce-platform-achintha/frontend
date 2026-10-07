import { formatMoney } from '@/utils/format'
import { cn } from '@/utils/cn'

const sizes = { sm: 'text-sm', md: 'text-base', lg: 'text-2xl' }

/**
 * Shows the server's price. When discounted, the list price is struck through next to it.
 * `from` adds "From" (search results show the lowest variant price).
 * Never compute prices here: pass the numbers the API returned.
 */
export default function PriceTag({ price, listPrice, discounted, from = false, size = 'md', className }) {
  const showList = (discounted ?? (listPrice != null && Number(listPrice) > Number(price))) && listPrice != null
  return (
    <span className={cn('inline-flex flex-wrap items-baseline gap-x-2', className)}>
      {from && <span className="text-xs text-slate-500 dark:text-slate-400">From</span>}
      <span className={cn('font-semibold text-slate-900 tabular-nums dark:text-slate-100', sizes[size], showList && 'text-danger-600 dark:text-danger-400')}>
        {formatMoney(price)}
      </span>
      {showList && (
        <span className="text-sm text-slate-400 tabular-nums line-through dark:text-slate-500">
          <span className="sr-only">Was </span>
          {formatMoney(listPrice)}
        </span>
      )}
    </span>
  )
}
