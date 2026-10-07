import { ChevronDown } from 'lucide-react'
import { cn } from '@/utils/cn'
import { fieldBase, fieldError, fieldHeight, fieldOk } from './styles'

/**
 * Native select (best on mobile and for keyboard users).
 * options: [{ value, label }] or pass <option> children. `placeholder` adds an empty first option.
 */
export default function Select({ invalid = false, options, placeholder, className, children, ref, ...props }) {
  return (
    <div className="relative">
      <select
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cn(fieldBase, fieldHeight, 'appearance-none pr-10', invalid ? fieldError : fieldOk, className)}
        {...props}
      >
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options
          ? options.map((o) => (
              <option key={o.value} value={o.value} disabled={o.disabled}>
                {o.label}
              </option>
            ))
          : children}
      </select>
      <ChevronDown aria-hidden="true" className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-slate-400" />
    </div>
  )
}
