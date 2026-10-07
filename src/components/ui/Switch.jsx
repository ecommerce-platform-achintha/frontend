import { useId } from 'react'
import { cn } from '@/utils/cn'
import { focusRing } from './styles'

// Toggle switch (role="switch"). Controlled: pass `checked` and `onChange(nextValue)`.
export default function Switch({ checked, onChange, label, description, disabled = false, className }) {
  const id = useId()
  return (
    <div className={cn('flex items-center justify-between gap-4', className)}>
      {(label || description) && (
        <span className="text-sm">
          <span id={`${id}-label`} className="font-medium text-slate-800 dark:text-slate-200">
            {label}
          </span>
          {description && <span className="block text-slate-500 dark:text-slate-400">{description}</span>}
        </span>
      )}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={label ? `${id}-label` : undefined}
        disabled={disabled}
        onClick={() => onChange?.(!checked)}
        className={cn(
          'relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50',
          focusRing,
          checked ? 'bg-primary-600 dark:bg-primary-500' : 'bg-slate-300 dark:bg-slate-700',
        )}
      >
        <span
          aria-hidden="true"
          className={cn('inline-block size-5 rounded-full bg-white shadow-soft transition-transform', checked ? 'translate-x-6' : 'translate-x-1')}
        />
      </button>
    </div>
  )
}
