import { useEffect, useId, useRef } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/utils/cn'
import IconButton from './IconButton'

/**
 * Side panel on the native <dialog> (focus trap + Escape for free).
 * Used for the mobile sidebar (side="left") and mobile filter panels (side="bottom", a bottom sheet).
 * `footer` stays visible under the scrolling content (e.g. an "Apply" button).
 */
const SIDES = {
  left: 'm-0 mr-auto h-dvh max-h-dvh w-[85vw] max-w-xs',
  right: 'm-0 ml-auto h-dvh max-h-dvh w-[85vw] max-w-xs',
  bottom: 'mx-0 mt-auto mb-0 max-h-[85dvh] w-full max-w-none rounded-t-2xl',
}

export default function Drawer({ open, onClose, title, side = 'left', footer, children, className }) {
  const ref = useRef(null)
  const titleId = useId()

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault()
        onClose?.()
      }}
      onClick={(e) => e.target === ref.current && onClose?.()}
      className={cn(
        'bg-white p-0 text-slate-900 shadow-pop open:animate-fade-in dark:bg-slate-900 dark:text-slate-100',
        SIDES[side] ?? SIDES.left,
      )}
    >
      {open && (
        <div className={cn('flex flex-col', side === 'bottom' ? 'max-h-[85dvh]' : 'h-full', className)}>
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
            <h2 id={titleId} className="text-base font-semibold">
              {title}
            </h2>
            <IconButton icon={X} label="Close menu" size="sm" onClick={onClose} />
          </div>
          <div className="flex-1 overflow-y-auto">{children}</div>
          {footer && <div className="border-t border-slate-100 px-4 py-3 dark:border-slate-800">{footer}</div>}
        </div>
      )}
    </dialog>
  )
}
