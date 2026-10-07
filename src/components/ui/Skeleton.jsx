import { cn } from '@/utils/cn'

// Grey placeholder block shown while lists load (use instead of spinners on lists).
export default function Skeleton({ className }) {
  return <div aria-hidden="true" className={cn('animate-pulse rounded-lg bg-slate-200/80 dark:bg-slate-800', className)} />
}

// A ready-made list skeleton: `rows` lines that look like table rows / cards.
export function SkeletonList({ rows = 5, className }) {
  return (
    <div role="status" aria-label="Loading" className={cn('space-y-3', className)}>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-4 rounded-xl border border-slate-100 p-4 dark:border-slate-800">
          <Skeleton className="size-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-2/5" />
            <Skeleton className="h-3 w-3/5" />
          </div>
          <Skeleton className="hidden h-6 w-20 rounded-full sm:block" />
        </div>
      ))}
    </div>
  )
}
