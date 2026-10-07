import { Minus, Plus } from 'lucide-react'
import { cn } from '@/utils/cn'

// − [ 2 ] + control. Clamps between min and max (cart lines: 1 to 100).
export default function QuantityStepper({ value, onChange, min = 1, max = 100, disabled = false, label = 'Quantity', className }) {
  const set = (next) => {
    if (Number.isNaN(next)) return
    onChange(Math.min(max, Math.max(min, next)))
  }
  const buttonClass =
    'flex size-10 items-center justify-center text-slate-600 transition-colors hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent dark:text-slate-300 dark:hover:bg-slate-800'

  return (
    <div
      className={cn(
        'inline-flex items-center overflow-hidden rounded-[var(--radius-control)] border border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-900',
        className,
      )}
    >
      <button type="button" className={buttonClass} onClick={() => set(value - 1)} disabled={disabled || value <= min} aria-label="Decrease quantity">
        <Minus aria-hidden="true" className="size-4" />
      </button>
      <input
        type="number"
        inputMode="numeric"
        aria-label={label}
        value={value}
        min={min}
        max={max}
        disabled={disabled}
        onChange={(e) => set(parseInt(e.target.value, 10))}
        className="h-10 w-12 border-x border-slate-200 bg-transparent text-center text-sm font-medium tabular-nums [appearance:textfield] focus:outline-none dark:border-slate-700 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
      <button type="button" className={buttonClass} onClick={() => set(value + 1)} disabled={disabled || value >= max} aria-label="Increase quantity">
        <Plus aria-hidden="true" className="size-4" />
      </button>
    </div>
  )
}
