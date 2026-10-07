import { Link } from 'react-router-dom'
import { ShoppingBag } from 'lucide-react'
import { cn } from '@/utils/cn'

export default function Logo({ to = '/', subtitle, className }) {
  return (
    <Link to={to} className={cn('flex items-center gap-2 rounded-lg', className)} aria-label="Marketplace home">
      <span className="flex size-9 items-center justify-center rounded-xl bg-primary-600 text-white shadow-soft dark:bg-primary-500">
        <ShoppingBag aria-hidden="true" className="size-5" />
      </span>
      <span className="leading-tight">
        <span className="block text-base font-bold tracking-tight text-slate-900 dark:text-white">Marketplace</span>
        {subtitle && <span className="block text-xs font-medium text-slate-500 dark:text-slate-400">{subtitle}</span>}
      </span>
    </Link>
  )
}
