import { ShoppingBag } from 'lucide-react'

// Shown while the saved session is restored (token refresh + profile) on page load.
export default function SplashScreen() {
  return (
    <div role="status" aria-label="Loading" className="flex min-h-dvh flex-col items-center justify-center gap-4">
      <span className="flex size-14 animate-pulse items-center justify-center rounded-2xl bg-primary-600 text-white shadow-card dark:bg-primary-500">
        <ShoppingBag aria-hidden="true" className="size-7" />
      </span>
      <p className="text-sm text-slate-500 dark:text-slate-400">Loading your account…</p>
    </div>
  )
}
