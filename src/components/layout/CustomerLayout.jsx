import { NavLink, Outlet } from 'react-router-dom'
import { CUSTOMER_NAV } from '@/config/navigation'
import { cn } from '@/utils/cn'

// Customer account area inside PublicLayout: side nav on desktop, scrollable pills on mobile.
export default function CustomerLayout() {
  const linkClass = ({ isActive }) =>
    cn(
      'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium whitespace-nowrap transition-colors',
      isActive
        ? 'bg-primary-50 text-primary-700 dark:bg-primary-500/15 dark:text-primary-200'
        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white',
    )

  return (
    <div className="lg:grid lg:grid-cols-[14rem_1fr] lg:gap-8">
      <nav aria-label="My account" className="-mx-4 mb-6 overflow-x-auto px-4 lg:mx-0 lg:mb-0 lg:px-0">
        <ul className="flex gap-1 lg:sticky lg:top-24 lg:flex-col">
          {CUSTOMER_NAV.map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <NavLink to={to} className={linkClass}>
                <Icon aria-hidden="true" className="size-4" />
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <div className="min-w-0">
        <Outlet />
      </div>
    </div>
  )
}
