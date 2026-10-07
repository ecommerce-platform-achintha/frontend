import { RefreshCw, TriangleAlert } from 'lucide-react'
import { cn } from '@/utils/cn'
import Button from './Button'

/**
 * Shows a normalised API error ({ code, message }) with a retry button.
 * Use for failed page/list loads; forms show errors inline instead.
 */
export default function ErrorState({ error, title = 'Could not load this', onRetry, className }) {
  const message = error?.message ?? 'Something went wrong.'
  return (
    <div role="alert" className={cn('flex flex-col items-center px-6 py-12 text-center', className)}>
      <div className="flex size-14 items-center justify-center rounded-2xl bg-danger-50 text-danger-600 dark:bg-danger-500/10 dark:text-danger-400">
        <TriangleAlert aria-hidden="true" className="size-7" />
      </div>
      <h3 className="mt-4 text-base font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">{message}</p>
      {onRetry && (
        <Button variant="outline" leftIcon={RefreshCw} onClick={onRetry} className="mt-6">
          Try again
        </Button>
      )}
    </div>
  )
}
