import { cn } from '@/utils/cn'
import { fieldBase, fieldError, fieldOk } from './styles'

// Textarea with an optional live character counter (shown when maxLength is set).
export default function Textarea({ invalid = false, className, maxLength, value, rows = 4, showCount = true, ref, ...props }) {
  const length = typeof value === 'string' ? value.length : 0
  return (
    <div>
      <textarea
        ref={ref}
        rows={rows}
        value={value}
        maxLength={maxLength}
        aria-invalid={invalid || undefined}
        className={cn(fieldBase, 'py-2.5 leading-relaxed', invalid ? fieldError : fieldOk, className)}
        {...props}
      />
      {maxLength && showCount && (
        <p className="mt-1 text-right text-xs text-slate-500 tabular-nums dark:text-slate-400" aria-live="polite">
          {length}/{maxLength}
        </p>
      )}
    </div>
  )
}
