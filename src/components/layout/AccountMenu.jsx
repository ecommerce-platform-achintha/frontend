import { useCallback, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { ChevronDown, KeyRound, LayoutDashboard, LogOut, User } from 'lucide-react'
import { selectAccessUser, selectDisplayName, selectIsAuthenticated, selectProfile } from '@/store/slices/authSlice'
import { CUSTOMER_NAV } from '@/config/navigation'
import { landingPathFor, ROLE_LABELS, ROLES } from '@/config/permissions'
import { useClickOutside } from '@/hooks/useClickOutside'
import { useSignOut } from '@/hooks/useSignOut'
import { initials } from '@/utils/format'
import { cn } from '@/utils/cn'
import Button from '@/components/ui/Button'

const itemClass =
  'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-100 focus-visible:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800 dark:focus-visible:bg-slate-800'

export default function AccountMenu({ align = 'right' }) {
  const isAuthenticated = useSelector(selectIsAuthenticated)
  const user = useSelector(selectAccessUser)
  const profile = useSelector(selectProfile)
  const name = useSelector(selectDisplayName)
  const signOut = useSignOut()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const close = useCallback(() => setOpen(false), [])
  useClickOutside(ref, close, open)

  if (!isAuthenticated) {
    return (
      <div className="flex items-center gap-2">
        {/* Wrapped: the Button's own inline-flex class would override `hidden`. */}
        <span className="hidden sm:block">
          <Button to="/login" variant="ghost" size="sm">
            Sign in
          </Button>
        </span>
        <Button to="/register" size="sm">
          Sign up
        </Button>
      </div>
    )
  }

  const isCustomer = user.role === ROLES.CUSTOMER
  const dashboardPath = landingPathFor(user)

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex h-11 items-center gap-2 rounded-xl px-1.5 hover:bg-slate-100 sm:px-2 dark:hover:bg-slate-800"
      >
        <span className="flex size-8 items-center justify-center rounded-full bg-primary-100 text-xs font-bold text-primary-700 dark:bg-primary-500/20 dark:text-primary-200">
          {name ? initials(name) : <User aria-hidden="true" className="size-4" />}
        </span>
        <span className="hidden max-w-32 truncate text-sm font-medium text-slate-800 md:block dark:text-slate-200">{name || 'Account'}</span>
        <ChevronDown aria-hidden="true" className="hidden size-4 text-slate-400 md:block" />
        <span className="sr-only">Account menu</span>
      </button>

      {open && (
        <div
          role="menu"
          className={cn(
            'absolute z-40 mt-2 w-64 animate-fade-in rounded-xl border border-slate-200 bg-white p-1.5 shadow-pop dark:border-slate-700 dark:bg-slate-900',
            align === 'right' ? 'right-0' : 'left-0',
          )}
        >
          <div className="px-3 py-2">
            <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{name || 'Signed in'}</p>
            <p className="truncate text-xs text-slate-500 dark:text-slate-400">
              {profile?.email ?? ''} {user.role && `· ${ROLE_LABELS[user.role]}`}
            </p>
          </div>
          <div className="my-1 h-px bg-slate-100 dark:bg-slate-800" />
          {isCustomer ? (
            CUSTOMER_NAV.map(({ to, label, icon: Icon }) => (
              <Link key={to} to={to} role="menuitem" className={itemClass} onClick={close}>
                <Icon aria-hidden="true" className="size-4 text-slate-400" />
                {label}
              </Link>
            ))
          ) : (
            <Link to={dashboardPath} role="menuitem" className={itemClass} onClick={close}>
              <LayoutDashboard aria-hidden="true" className="size-4 text-slate-400" />
              {user.role === ROLES.ADMIN || user.role === ROLES.SUPER_ADMIN ? 'Admin console' : 'Seller center'}
            </Link>
          )}
          <Link to="/change-password" role="menuitem" className={itemClass} onClick={close}>
            <KeyRound aria-hidden="true" className="size-4 text-slate-400" />
            Change password
          </Link>
          <div className="my-1 h-px bg-slate-100 dark:bg-slate-800" />
          <button
            type="button"
            role="menuitem"
            className={cn(itemClass, 'text-danger-600 dark:text-danger-400')}
            onClick={() => {
              close()
              signOut()
            }}
          >
            <LogOut aria-hidden="true" className="size-4" />
            Sign out
          </button>
        </div>
      )}
    </div>
  )
}
