import { useEffect, useId, useRef } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/utils/cn'
import IconButton from './IconButton'

const sizes = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' }

/**
 * Accessible modal built on the native <dialog>: focus trap, Escape to close and
 * inert background come from the browser.
 */
export default function Modal({ open, onClose, title, description, size = 'md', footer, children, dismissible = true }) {
  const ref = useRef(null)
  const titleId = useId()

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  // Escape fires "cancel": route it through onClose so React state stays the source of truth.
  const handleCancel = (event) => {
    event.preventDefault()
    if (dismissible) onClose?.()
  }

  // Clicking the backdrop (the dialog element itself) closes it.
  const handleClick = (event) => {
    if (dismissible && event.target === ref.current) onClose?.()
  }

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={handleCancel}
      onClick={handleClick}
      className={cn(
        'm-auto w-[calc(100%-2rem)] rounded-[var(--radius-card)] bg-white p-0 text-slate-900 shadow-pop open:animate-slide-up',
        'dark:bg-slate-900 dark:text-slate-100 dark:ring-1 dark:ring-slate-800',
        sizes[size],
      )}
    >
      {open && (
        <div className="flex max-h-[85dvh] flex-col">
          <header className="flex items-start justify-between gap-4 px-6 pt-5 pb-3">
            <div>
              <h2 id={titleId} className="text-lg font-semibold">
                {title}
              </h2>
              {description && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>}
            </div>
            {dismissible && <IconButton icon={X} label="Close" size="sm" onClick={onClose} className="-mt-1 -mr-2" />}
          </header>
          <div className="overflow-y-auto px-6 pb-5">{children}</div>
          {footer && (
            <footer className="flex flex-col-reverse gap-2 border-t border-slate-100 px-6 py-4 sm:flex-row sm:justify-end dark:border-slate-800">
              {footer}
            </footer>
          )}
        </div>
      )}
    </dialog>
  )
}
