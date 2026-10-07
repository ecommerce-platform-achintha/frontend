import { Link } from 'react-router-dom'
import { LoaderCircle } from 'lucide-react'
import { cn } from '@/utils/cn'
import { focusRing } from './styles'

const variants = {
  primary: 'bg-primary-600 text-white shadow-soft hover:bg-primary-700 active:bg-primary-800 dark:bg-primary-500 dark:hover:bg-primary-400',
  secondary:
    'bg-primary-50 text-primary-700 hover:bg-primary-100 dark:bg-primary-500/15 dark:text-primary-200 dark:hover:bg-primary-500/25',
  outline:
    'border border-slate-300 bg-white text-slate-800 shadow-soft hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800',
  ghost: 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
  danger: 'bg-danger-600 text-white shadow-soft hover:bg-danger-700 active:bg-danger-800 dark:bg-danger-500 dark:hover:bg-danger-400',
  success: 'bg-success-600 text-white shadow-soft hover:bg-success-700 dark:bg-success-500 dark:hover:bg-success-400',
}

const sizes = {
  sm: 'h-9 gap-1.5 px-3 text-sm',
  md: 'h-11 gap-2 px-4 text-sm',
  lg: 'h-12 gap-2 px-6 text-base',
}

/**
 * Button. Pass `to` to render a router link styled as a button.
 * `loading` disables the button and shows a spinner.
 */
export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  leftIcon: LeftIcon,
  rightIcon: RightIcon,
  to,
  type = 'button',
  className,
  children,
  ...props
}) {
  const classes = cn(
    'inline-flex shrink-0 select-none items-center justify-center whitespace-nowrap rounded-[var(--radius-control)] font-semibold transition-colors',
    'disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50',
    focusRing,
    variants[variant],
    sizes[size],
    fullWidth && 'w-full',
    className,
  )
  const content = (
    <>
      {loading ? (
        <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
      ) : (
        LeftIcon && <LeftIcon aria-hidden="true" className="size-4" />
      )}
      {children}
      {RightIcon && !loading && <RightIcon aria-hidden="true" className="size-4" />}
    </>
  )

  if (to) {
    return (
      <Link to={to} className={classes} aria-disabled={disabled || undefined} {...props}>
        {content}
      </Link>
    )
  }
  return (
    <button type={type} className={classes} disabled={disabled || loading} aria-busy={loading || undefined} {...props}>
      {content}
    </button>
  )
}
