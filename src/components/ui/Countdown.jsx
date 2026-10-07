import { Clock } from 'lucide-react'
import { useNow } from '@/hooks/useNow'
import { formatDateTime } from '@/utils/format'
import { cn } from '@/utils/cn'

function parts(ms) {
  const total = Math.max(0, Math.floor(ms / 1000))
  return {
    days: Math.floor(total / 86400),
    hours: Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  }
}

function label(ms) {
  const { days, hours, minutes, seconds } = parts(ms)
  if (days > 0) return `${days}d ${hours}h`
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m ${String(seconds).padStart(2, '0')}s`
}

/**
 * Time left until `deadlineAt` (ISO string from the server). Shows the server deadline as given;
 * never compute your own (the server already skips holidays).
 * Recomputed from the clock every second, so it does not drift.
 */
export default function Countdown({ deadlineAt, expiredLabel = 'Time is up', className }) {
  const deadline = deadlineAt ? new Date(deadlineAt).getTime() : NaN
  const valid = Number.isFinite(deadline)
  const now = useNow(1000, valid)
  if (!valid) return null

  const left = deadline - now
  const expired = left <= 0
  const urgent = !expired && left < 3600 * 1000

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 text-sm font-medium tabular-nums',
        expired ? 'text-slate-500 dark:text-slate-400' : urgent ? 'text-danger-600 dark:text-danger-400' : 'text-warning-700 dark:text-warning-400',
        className,
      )}
      title={`Deadline: ${formatDateTime(deadlineAt)}`}
    >
      <Clock aria-hidden="true" className="size-4" />
      <time dateTime={deadlineAt}>{expired ? expiredLabel : `${label(left)} left`}</time>
    </span>
  )
}
