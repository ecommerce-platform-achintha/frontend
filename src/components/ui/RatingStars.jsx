import { useId } from 'react'
import { Star } from 'lucide-react'
import { cn } from '@/utils/cn'

/**
 * Read-only: <RatingStars value={4.3} count={12} />
 * Input:     <RatingStars value={rating} onChange={setRating} />  (radio group, keyboard friendly)
 */
export default function RatingStars({ value = 0, count, onChange, size = 'sm', className }) {
  const name = useId()
  const iconSize = size === 'lg' ? 'size-7' : size === 'md' ? 'size-5' : 'size-4'

  if (onChange) {
    return (
      <fieldset className={cn('flex items-center gap-1', className)}>
        <legend className="sr-only">Rating</legend>
        {[1, 2, 3, 4, 5].map((n) => (
          <label key={n} className="cursor-pointer rounded p-0.5 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-primary-500">
            <input type="radio" name={name} value={n} checked={value === n} onChange={() => onChange(n)} className="sr-only" />
            <Star
              aria-hidden="true"
              className={cn(iconSize, n <= value ? 'fill-warning-400 text-warning-400' : 'text-slate-300 dark:text-slate-600')}
            />
            <span className="sr-only">{n} star{n > 1 ? 's' : ''}</span>
          </label>
        ))}
      </fieldset>
    )
  }

  const rounded = Math.round(Number(value) * 2) / 2 // nearest half
  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      <span className="flex" aria-hidden="true">
        {[1, 2, 3, 4, 5].map((n) => {
          const fill = rounded >= n ? 1 : rounded >= n - 0.5 ? 0.5 : 0
          return (
            <span key={n} className="relative">
              <Star className={cn(iconSize, 'text-slate-300 dark:text-slate-600')} />
              {fill > 0 && (
                <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
                  <Star className={cn(iconSize, 'fill-warning-400 text-warning-400')} />
                </span>
              )}
            </span>
          )
        })}
      </span>
      <span className="sr-only">Rated {Number(value).toFixed(1)} out of 5</span>
      {count !== undefined && (
        <span className="text-xs text-slate-500 tabular-nums dark:text-slate-400">
          {Number(value) > 0 ? Number(value).toFixed(1) : '—'} ({count})
        </span>
      )}
    </span>
  )
}
