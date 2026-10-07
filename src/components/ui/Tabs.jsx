import { useId, useRef } from 'react'
import { cn } from '@/utils/cn'

/**
 * Accessible tabs (arrow keys, Home and End move between tabs).
 * tabs: [{ value, label, count? }]. Controlled: `value` + `onChange(value)`.
 * `children` (optional) is the active panel, or a function of the active value.
 */
export default function Tabs({ tabs, value, onChange, className, children }) {
  const baseId = useId()
  const listRef = useRef(null)

  const onKeyDown = (event) => {
    const index = tabs.findIndex((t) => t.value === value)
    let next
    if (event.key === 'ArrowRight') next = (index + 1) % tabs.length
    else if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length
    else if (event.key === 'Home') next = 0
    else if (event.key === 'End') next = tabs.length - 1
    else return
    event.preventDefault()
    onChange(tabs[next].value)
    listRef.current?.querySelectorAll('[role="tab"]')[next]?.focus()
  }

  return (
    <div className={className}>
      <div
        ref={listRef}
        role="tablist"
        onKeyDown={onKeyDown}
        className="-mx-1 flex gap-1 overflow-x-auto border-b border-slate-200 px-1 dark:border-slate-800"
      >
        {tabs.map((tab) => {
          const selected = tab.value === value
          return (
            <button
              key={tab.value}
              type="button"
              role="tab"
              id={`${baseId}-tab-${tab.value}`}
              aria-selected={selected}
              aria-controls={children ? `${baseId}-panel` : undefined}
              tabIndex={selected ? 0 : -1}
              onClick={() => onChange(tab.value)}
              className={cn(
                '-mb-px inline-flex h-11 items-center gap-2 border-b-2 px-3 text-sm font-medium whitespace-nowrap transition-colors',
                selected
                  ? 'border-primary-600 text-primary-700 dark:border-primary-400 dark:text-primary-300'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200',
              )}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs tabular-nums dark:bg-slate-800">{tab.count}</span>
              )}
            </button>
          )
        })}
      </div>
      {children && (
        <div role="tabpanel" id={`${baseId}-panel`} aria-labelledby={`${baseId}-tab-${value}`} className="pt-4">
          {typeof children === 'function' ? children(value) : children}
        </div>
      )}
    </div>
  )
}
