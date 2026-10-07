import { useId } from 'react'
import { cn } from '@/utils/cn'

// Checkbox with its label. `description` adds a muted second line.
export default function Checkbox({ label, description, className, id, ...props }) {
  const autoId = useId()
  const inputId = id ?? autoId
  return (
    <label htmlFor={inputId} className={cn('flex cursor-pointer items-start gap-3 py-1', props.disabled && 'cursor-not-allowed opacity-60', className)}>
      <input
        id={inputId}
        type="checkbox"
        className="mt-0.5 size-5 shrink-0 cursor-pointer rounded-md border-slate-300 accent-primary-600 dark:accent-primary-500"
        {...props}
      />
      <span className="text-sm">
        <span className="font-medium text-slate-800 dark:text-slate-200">{label}</span>
        {description && <span className="block text-slate-500 dark:text-slate-400">{description}</span>}
      </span>
    </label>
  )
}
