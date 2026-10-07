import { useEffect, useId, useRef } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/utils/cn'
import IconButton from './IconButton'

/**
 * Side panel on the native <dialog> (focus trap + Escape for free).
 * Used for the mobile sidebar and for filter panels.
 */
export default function Drawer({ open, onClose, title, side = 'left', children, className }) {
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
        'm-0 h-dvh max-h-dvh w-[85vw] max-w-xs bg-white p-0 text-slate-900 shadow-pop open:animate-fade-in dark:bg-slate-900 dark:text-slate-100',
        side === 'left' ? 'mr-auto' : 'ml-auto',
      )}
    >
      {open && (
        <div className={cn('flex h-full flex-col', className)}>
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
            <h2 id={titleId} className="text-base font-semibold">
              {title}
            </h2>
            <IconButton icon={X} label="Close menu" size="sm" onClick={onClose} />
          </div>
          <div className="flex-1 overflow-y-auto">{children}</div>
        </div>
      )}
    </dialog>
  )
}
