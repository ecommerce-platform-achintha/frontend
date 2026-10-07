import { cn } from '@/utils/cn'
import { fieldBase, fieldError, fieldHeight, fieldOk } from './styles'

/**
 * LKR amount input. Keeps the value as a string (e.g. "1250.50") so typing is not disturbed;
 * convert with Number() when sending. Blocks characters that can never be valid.
 */
export default function MoneyInput({ value, onChange, invalid = false, className, ref, ...props }) {
  const handleChange = (event) => {
    const next = event.target.value.replace(/,/g, '')
    // Allow only digits and at most one dot with up to 2 decimals while typing.
    if (next === '' || /^\d*\.?\d{0,2}$/.test(next)) onChange?.(next)
  }
  return (
    <div className="relative">
      <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-sm font-medium text-slate-500 dark:text-slate-400">
        LKR
      </span>
      <input
        ref={ref}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        value={value ?? ''}
        onChange={handleChange}
        aria-invalid={invalid || undefined}
        className={cn(fieldBase, fieldHeight, 'pl-14 tabular-nums', invalid ? fieldError : fieldOk, className)}
        {...props}
      />
    </div>
  )
}
