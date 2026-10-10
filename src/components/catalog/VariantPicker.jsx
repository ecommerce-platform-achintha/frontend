import { isValueAvailable, pickValue } from '@/utils/variants'
import { cn } from '@/utils/cn'

// One button group per option. Values with no in-stock variant (for the choices so far) are disabled.
export default function VariantPicker({ product, selection, onChange }) {
  const options = product.options ?? []
  if (options.length === 0) return null
  return (
    <div className="space-y-4">
      {options.map((option) => (
        <fieldset key={option.name}>
          <legend className="mb-2 text-sm font-medium text-slate-800 dark:text-slate-200">
            {option.name}: <span className="font-normal text-slate-500 dark:text-slate-400">{selection[option.name] ?? 'Choose'}</span>
          </legend>
          <div className="flex flex-wrap gap-2">
            {option.values.map((value) => {
              const selected = selection[option.name] === value
              const available = isValueAvailable(product, selection, option.name, value)
              return (
                <button
                  key={value}
                  type="button"
                  aria-pressed={selected}
                  disabled={!available}
                  onClick={() => onChange(pickValue(product, selection, option.name, value))}
                  className={cn(
                    'h-10 min-w-12 rounded-xl border px-4 text-sm font-medium transition',
                    selected
                      ? 'border-primary-600 bg-primary-50 text-primary-800 ring-1 ring-primary-600 dark:border-primary-400 dark:bg-primary-500/15 dark:text-primary-100 dark:ring-primary-400'
                      : 'border-slate-300 bg-white text-slate-800 hover:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200',
                    !available && 'cursor-not-allowed border-dashed text-slate-400 line-through opacity-60 hover:border-slate-300 dark:text-slate-500',
                  )}
                >
                  {value}
                  {!available && <span className="sr-only"> (not available)</span>}
                </button>
              )
            })}
          </div>
        </fieldset>
      ))}
    </div>
  )
}
