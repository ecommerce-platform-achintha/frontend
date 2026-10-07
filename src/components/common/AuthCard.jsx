import Card from '@/components/ui/Card'
import { cn } from '@/utils/cn'

// Card used by every auth page.
export default function AuthCard({ title, description, footer, wide = false, children }) {
  return (
    <div className={cn('w-full', wide ? 'max-w-xl' : 'max-w-md')}>
      <Card className="p-6 sm:p-8">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{title}</h1>
        {description && <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">{description}</p>}
        <div className="mt-6">{children}</div>
      </Card>
      {footer && <div className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">{footer}</div>}
    </div>
  )
}
