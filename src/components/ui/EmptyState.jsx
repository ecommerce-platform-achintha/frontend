import { Inbox } from 'lucide-react'
import { cn } from '@/utils/cn'

// Friendly "nothing here yet" with a next step. `action` is usually a <Button>.
export default function EmptyState({ icon: Icon = Inbox, title, description, action, className }) {
  return (
    <div className={cn('flex flex-col items-center px-6 py-14 text-center', className)}>
      <div className="flex size-14 items-center justify-center rounded-2xl bg-primary-50 text-primary-600 dark:bg-primary-500/10 dark:text-primary-300">
        <Icon aria-hidden="true" className="size-7" />
      </div>
      <h3 className="mt-4 text-base font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}
