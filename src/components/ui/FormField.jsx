import { Children, cloneElement, isValidElement, useId } from 'react'
import { CircleAlert } from 'lucide-react'
import { cn } from '@/utils/cn'

/**
 * Label + control + hint + error. The single child control receives
 * `id`, `invalid` and `aria-describedby` automatically.
 *
 * <FormField label="Email" error={errors.email}><Input type="email" ... /></FormField>
 */
export default function FormField({ label, hint, error, required = false, id, className, children }) {
  const autoId = useId()
  const fieldId = id ?? autoId
  const hintId = hint ? `${fieldId}-hint` : undefined
  const errorId = error ? `${fieldId}-error` : undefined
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined

  const child = Children.only(children)
  const control = isValidElement(child)
    ? cloneElement(child, { id: fieldId, invalid: Boolean(error), 'aria-describedby': describedBy, required: required || undefined })
    : child

  return (
    <div className={cn('space-y-1.5', className)}>
      {label && (
        <label htmlFor={fieldId} className="block text-sm font-medium text-slate-800 dark:text-slate-200">
          {label}
          {required && (
            <span className="ml-0.5 text-danger-600" aria-hidden="true">
              *
            </span>
          )}
        </label>
      )}
      {control}
      {hint && (
        <p id={hintId} className="text-xs text-slate-500 dark:text-slate-400">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="flex items-start gap-1.5 text-xs font-medium text-danger-600 dark:text-danger-400">
          <CircleAlert aria-hidden="true" className="mt-px size-3.5 shrink-0" />
          {error}
        </p>
      )}
    </div>
  )
}
