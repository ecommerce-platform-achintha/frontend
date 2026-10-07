import { CircleAlert, CircleCheck, Info } from 'lucide-react'
import { cn } from '@/utils/cn'

const tones = {
  error: { icon: CircleAlert, cls: 'bg-danger-50 text-danger-800 ring-danger-200 dark:bg-danger-500/10 dark:text-danger-200 dark:ring-danger-500/30' },
  success: { icon: CircleCheck, cls: 'bg-success-50 text-success-800 ring-success-200 dark:bg-success-500/10 dark:text-success-200 dark:ring-success-500/30' },
  info: { icon: Info, cls: 'bg-sky-50 text-sky-800 ring-sky-200 dark:bg-sky-500/10 dark:text-sky-200 dark:ring-sky-500/30' },
}

// Message box at the top of a form (server `message`, success notes, session expired, ...).
export default function FormAlert({ tone = 'error', title, children, className }) {
  if (!children && !title) return null
  const { icon: Icon, cls } = tones[tone] ?? tones.info
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={cn('flex items-start gap-3 rounded-xl px-4 py-3 text-sm ring-1 ring-inset', cls, className)}>
      <Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      <div>
        {title && <p className="font-semibold">{title}</p>}
        {children && <div>{children}</div>}
      </div>
    </div>
  )
}
