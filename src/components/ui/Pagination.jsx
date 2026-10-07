import { ChevronLeft, ChevronRight } from 'lucide-react'
import { PAGE_SIZE_OPTIONS } from '@/config/constants'
import IconButton from './IconButton'

/**
 * Server-side pagination. `page` is 0-based (as the API), shown 1-based.
 * Pass the page info from the response: { page, size, totalElements, totalPages }.
 */
export default function Pagination({
  page = 0,
  size,
  totalElements = 0,
  totalPages = 0,
  onPageChange,
  onSizeChange,
  sizeOptions = PAGE_SIZE_OPTIONS,
}) {
  if (totalElements === 0) return null
  const from = page * size + 1
  const to = Math.min((page + 1) * size, totalElements)

  return (
    <nav aria-label="Pagination" className="flex flex-col items-center justify-between gap-3 pt-4 text-sm sm:flex-row">
      <p className="text-slate-500 tabular-nums dark:text-slate-400">
        {from}–{to} of {totalElements}
      </p>
      <div className="flex items-center gap-3">
        {onSizeChange && (
          <label className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
            <span>Per page</span>
            <select
              value={size}
              onChange={(e) => onSizeChange(Number(e.target.value))}
              className="h-9 rounded-lg border border-slate-300 bg-white px-2 text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              {/* The server may cap the size; keep the current value selectable. */}
              {[...new Set([...sizeOptions, size])].sort((a, b) => a - b).map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        )}
        <div className="flex items-center gap-1">
          <IconButton icon={ChevronLeft} label="Previous page" size="sm" variant="outline" disabled={page <= 0} onClick={() => onPageChange(page - 1)} />
          <span className="min-w-20 text-center text-slate-700 tabular-nums dark:text-slate-300" aria-current="page">
            {page + 1} / {Math.max(totalPages, 1)}
          </span>
          <IconButton
            icon={ChevronRight}
            label="Next page"
            size="sm"
            variant="outline"
            disabled={page + 1 >= totalPages}
            onClick={() => onPageChange(page + 1)}
          />
        </div>
      </div>
    </nav>
  )
}
