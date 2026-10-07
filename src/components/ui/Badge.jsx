import { cn } from '@/utils/cn'
import { toneClasses } from './styles'

// Small pill. tone: neutral | primary | info | success | warning | danger.
export default function Badge({ tone = 'neutral', icon: Icon, className, children }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset',
        toneClasses[tone] ?? toneClasses.neutral,
        className,
      )}
    >
      {Icon && <Icon aria-hidden="true" className="size-3.5" />}
      {children}
    </span>
  )
}
