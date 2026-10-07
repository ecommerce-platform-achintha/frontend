import { cn } from '@/utils/cn'

// Rounded white surface. Use Card.Header / Card.Body / Card.Footer for consistent spacing.
export default function Card({ as: Tag = 'section', className, children, ...props }) {
  return (
    <Tag
      className={cn(
        'rounded-[var(--radius-card)] border border-slate-200/70 bg-white shadow-card dark:border-slate-800 dark:bg-slate-900 dark:shadow-none',
        className,
      )}
      {...props}
    >
      {children}
    </Tag>
  )
}

function CardHeader({ title, description, actions, className }) {
  return (
    <div className={cn('flex flex-wrap items-start justify-between gap-3 px-5 pt-5 sm:px-6', className)}>
      <div>
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}

function CardBody({ className, children }) {
  return <div className={cn('px-5 py-5 sm:px-6', className)}>{children}</div>
}

function CardFooter({ className, children }) {
  return (
    <div className={cn('flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 px-5 py-4 sm:px-6 dark:border-slate-800', className)}>
      {children}
    </div>
  )
}

Card.Header = CardHeader
Card.Body = CardBody
Card.Footer = CardFooter
