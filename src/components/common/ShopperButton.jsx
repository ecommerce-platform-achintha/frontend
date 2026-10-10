import { Info } from 'lucide-react'
import { useShopper } from '@/hooks/useShopper'
import Button from '@/components/ui/Button'
import Tooltip from '@/components/ui/Tooltip'
import { cn } from '@/utils/cn'

/**
 * Button for shopping actions (Add to cart, Checkout, Confirm quote, Pay).
 * - guest: sends to /login?next=<this page>
 * - merchant / assistant / admin: short notice instead of the button
 * - banned customer: disabled, tooltip shows the ban reason
 * - customer: normal button
 * `allowBanned` keeps it enabled for banned customers (e.g. cancel, mark received).
 */
export default function ShopperButton({ onClick, allowBanned = false, className, fullWidth, ...props }) {
  const { mode, goToLogin, bannedReason } = useShopper()

  if (mode === 'nonCustomer') {
    return (
      <p className={cn('flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-300', className)}>
        <Info aria-hidden="true" className="size-4 shrink-0" />
        Shopping is available to customer accounts.
      </p>
    )
  }

  if (mode === 'banned' && !allowBanned) {
    return (
      <Tooltip content={bannedReason} className={cn(fullWidth && 'flex w-full', className)}>
        <Button {...props} fullWidth={fullWidth} disabled />
      </Tooltip>
    )
  }

  return <Button {...props} className={className} fullWidth={fullWidth} onClick={mode === 'guest' ? goToLogin : onClick} />
}
