import { useId } from 'react'
import { cn } from '@/utils/cn'

/**
 * Small text tooltip shown on hover and on keyboard focus.
 * Wraps its child in a span so it also works around disabled buttons
 * (disabled elements do not fire hover events themselves).
 */
export default function Tooltip({ content, side = 'top', className, children }) {
  const id = useId()
  if (!content) return children
  return (
    <span className={cn('group/tooltip relative inline-flex', className)} aria-describedby={id} tabIndex={-1}>
      {children}
      <span
        id={id}
        role="tooltip"
        className={cn(
          'pointer-events-none absolute left-1/2 z-40 w-max max-w-60 -translate-x-1/2 rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-white opacity-0 shadow-pop transition-opacity',
          'group-hover/tooltip:opacity-100 group-focus-within/tooltip:opacity-100 dark:bg-slate-700',
          side === 'top' ? 'bottom-full mb-2' : 'top-full mt-2',
        )}
      >
        {content}
      </span>
    </span>
  )
}
