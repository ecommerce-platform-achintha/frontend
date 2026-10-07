import { Check, X } from 'lucide-react'
import { cn } from '@/utils/cn'

/**
 * Horizontal progress (vertical on small screens).
 * steps: [{ key, label }], currentIndex: active step, failed: the active step stopped the flow.
 * For orders, get these from orderProgress() in config/orders.js.
 */
export default function Stepper({ steps, currentIndex = 0, failed = false, className }) {
  return (
    <ol className={cn('flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-0', className)}>
      {steps.map((step, index) => {
        const done = index < currentIndex || (index === currentIndex && !failed && index === steps.length - 1)
        const active = index === currentIndex
        const state = done ? 'done' : active ? (failed ? 'failed' : 'active') : 'todo'
        return (
          <li key={step.key} className="flex items-center gap-3 sm:flex-1 sm:flex-col sm:gap-2 sm:text-center" aria-current={active ? 'step' : undefined}>
            <div className="flex items-center sm:w-full">
              <span
                className={cn('hidden h-0.5 flex-1 sm:block', index === 0 ? 'invisible' : index <= currentIndex ? 'bg-primary-500' : 'bg-slate-200 dark:bg-slate-700')}
              />
              <span
                className={cn(
                  'flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                  state === 'done' && 'bg-primary-600 text-white dark:bg-primary-500',
                  state === 'active' && 'bg-primary-50 text-primary-700 ring-2 ring-primary-500 dark:bg-primary-500/15 dark:text-primary-200',
                  state === 'failed' && 'bg-danger-600 text-white dark:bg-danger-500',
                  state === 'todo' && 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
                )}
              >
                {state === 'done' ? <Check aria-hidden="true" className="size-4" /> : state === 'failed' ? <X aria-hidden="true" className="size-4" /> : index + 1}
              </span>
              <span
                className={cn(
                  'hidden h-0.5 flex-1 sm:block',
                  index === steps.length - 1 ? 'invisible' : index < currentIndex ? 'bg-primary-500' : 'bg-slate-200 dark:bg-slate-700',
                )}
              />
            </div>
            <span
              className={cn(
                'text-sm sm:text-xs',
                active ? 'font-semibold text-slate-900 dark:text-slate-100' : 'text-slate-500 dark:text-slate-400',
              )}
            >
              {step.label}
              {state === 'failed' && <span className="sr-only"> (stopped here)</span>}
            </span>
          </li>
        )
      })}
    </ol>
  )
}
