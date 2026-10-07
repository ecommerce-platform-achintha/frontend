import { cn } from '@/utils/cn'
import { focusRing } from './styles'

const variants = {
  ghost: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100',
  outline:
    'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800',
  danger: 'text-danger-600 hover:bg-danger-50 dark:text-danger-400 dark:hover:bg-danger-500/10',
}

const sizes = { sm: 'size-9', md: 'size-11' }

// Icon-only button. `label` is required: it is the accessible name screen readers announce.
export default function IconButton({ icon: Icon, label, variant = 'ghost', size = 'md', className, type = 'button', ...props }) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-[var(--radius-control)] transition-colors disabled:pointer-events-none disabled:opacity-50',
        focusRing,
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      <Icon aria-hidden="true" className="size-5" />
    </button>
  )
}
