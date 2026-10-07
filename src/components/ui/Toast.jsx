import { useCallback, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { CircleAlert, CircleCheck, Info, TriangleAlert, X } from 'lucide-react'
import { selectToasts, toastDismissed } from '@/store/slices/uiSlice'
import { TOAST_DURATION_MS } from '@/config/constants'
import { cn } from '@/utils/cn'

const styles = {
  success: { icon: CircleCheck, color: 'text-success-600 dark:text-success-400' },
  error: { icon: CircleAlert, color: 'text-danger-600 dark:text-danger-400' },
  warning: { icon: TriangleAlert, color: 'text-warning-600 dark:text-warning-400' },
  info: { icon: Info, color: 'text-primary-600 dark:text-primary-400' },
}

export function Toast({ toast }) {
  const dispatch = useDispatch()
  const { icon: Icon, color } = styles[toast.type] ?? styles.info
  const dismiss = useCallback(() => dispatch(toastDismissed(toast.id)), [dispatch, toast.id])

  // Auto-dismiss. Errors stay a bit longer so they can be read.
  useEffect(() => {
    const id = setTimeout(dismiss, toast.type === 'error' ? TOAST_DURATION_MS * 1.5 : TOAST_DURATION_MS)
    return () => clearTimeout(id)
  }, [dismiss, toast.type])

  return (
    <div
      role={toast.type === 'error' ? 'alert' : 'status'}
      className="pointer-events-auto flex w-full animate-slide-up items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-pop dark:border-slate-700 dark:bg-slate-900"
    >
      <Icon aria-hidden="true" className={cn('mt-0.5 size-5 shrink-0', color)} />
      <div className="min-w-0 flex-1 text-sm">
        {toast.title && <p className="font-semibold text-slate-900 dark:text-slate-100">{toast.title}</p>}
        {toast.message && <p className="text-slate-600 dark:text-slate-300">{toast.message}</p>}
      </div>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss"
        className="-m-1 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
      >
        <X aria-hidden="true" className="size-4" />
      </button>
    </div>
  )
}

// Renders all toasts from the ui slice. Mounted once in AppRoot. Use the useToast() hook to show one.
export default function Toaster() {
  const toasts = useSelector(selectToasts)
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center p-4 sm:inset-x-auto sm:right-0 sm:justify-end"
    >
      <div className="flex w-full max-w-sm flex-col gap-2">
        {toasts.map((toast) => (
          <Toast key={toast.id} toast={toast} />
        ))}
      </div>
    </div>
  )
}
