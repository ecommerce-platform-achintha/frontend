import { useState } from 'react'
import { Check, Eye, EyeOff, X } from 'lucide-react'
import { cn } from '@/utils/cn'
import { checkPassword } from '@/utils/validators'
import Input from './Input'

/**
 * Password input with a show/hide toggle.
 * `showChecklist` renders the live policy checklist (use it for new passwords, not for login).
 */
export default function PasswordInput({ showChecklist = false, value, id, className, ...props }) {
  const [visible, setVisible] = useState(false)
  const { rules } = checkPassword(value)
  const checklistId = id ? `${id}-rules` : undefined
  const describedBy = [props['aria-describedby'], showChecklist ? checklistId : null].filter(Boolean).join(' ') || undefined

  return (
    <div className={className}>
      <div className="relative">
        <Input
          id={id}
          type={visible ? 'text' : 'password'}
          value={value}
          className="pr-12"
          autoCapitalize="none"
          spellCheck={false}
          {...props}
          aria-describedby={describedBy}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute top-1/2 right-1.5 flex size-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
        >
          {visible ? <EyeOff aria-hidden="true" className="size-4" /> : <Eye aria-hidden="true" className="size-4" />}
        </button>
      </div>
      {showChecklist && (
        <ul id={checklistId} className="mt-2 grid gap-1 text-xs sm:grid-cols-2" aria-label="Password rules">
          {rules.map((rule) => (
            <li
              key={rule.id}
              className={cn(
                'flex items-center gap-1.5',
                rule.ok ? 'text-success-700 dark:text-success-400' : 'text-slate-500 dark:text-slate-400',
              )}
            >
              {rule.ok ? <Check aria-hidden="true" className="size-3.5" /> : <X aria-hidden="true" className="size-3.5" />}
              <span>
                {rule.label}
                <span className="sr-only">{rule.ok ? ' (met)' : ' (not met)'}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
