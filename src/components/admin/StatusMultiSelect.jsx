import { cn } from '@/utils/cn'
import { STATUS_LABELS } from '@/config/enums'
import { humanizeEnum } from '@/utils/format'

/**
 * Toggle chips for a multi-value status filter (sent as repeated `status` params).
 * value: string[]; onChange(next). Empty means "all". `labels` overrides chip text per value.
 */
export default function StatusMultiSelect({ options, value, onChange, label = 'Status', labels = {} }) {
  const toggle = (s) => onChange(value.includes(s) ? value.filter((x) => x !== s) : [...value, s])
  return (
    <fieldset>
      <legend className="sr-only">{label}</legend>
      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          aria-pressed={value.length === 0}
          onClick={() => onChange([])}
          className={cn('rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset', value.length === 0 ? 'bg-primary-600 text-white ring-primary-600' : 'ring-slate-300 dark:ring-slate-700')}
        >
          All
        </button>
        {options.map((s) => (
          <button
            key={s}
            type="button"
            aria-pressed={value.includes(s)}
            onClick={() => toggle(s)}
            className={cn(
              'rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset',
              value.includes(s) ? 'bg-primary-600 text-white ring-primary-600' : 'text-slate-700 ring-slate-300 dark:text-slate-300 dark:ring-slate-700',
            )}
          >
            {labels[s] ?? STATUS_LABELS[s] ?? humanizeEnum(s)}
          </button>
        ))}
      </div>
    </fieldset>
  )
}
