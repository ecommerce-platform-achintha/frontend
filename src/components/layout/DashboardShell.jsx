import { useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { ExternalLink, LogOut, Menu } from 'lucide-react'
import { cn } from '@/utils/cn'
import Logo from '@/components/common/Logo'
import ThemeToggle from '@/components/common/ThemeToggle'
import StatusBanner from '@/components/common/StatusBanner'
import GlobalBanners from '@/components/common/GlobalBanners'
import Drawer from '@/components/ui/Drawer'
import IconButton from '@/components/ui/IconButton'
import { useSignOut } from '@/hooks/useSignOut'
import AccountMenu from './AccountMenu'

function SidebarNav({ groups, onNavigate }) {
  const linkClass = ({ isActive }) =>
    cn(
      'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
      isActive
        ? 'bg-primary-50 text-primary-700 dark:bg-primary-500/15 dark:text-primary-200'
        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white',
    )
  return (
    <nav aria-label="Main" className="space-y-6 px-3 py-4">
      {groups.map((group) => (
        <div key={group.title}>
          <p className="px-3 pb-2 text-xs font-semibold tracking-wide text-slate-400 uppercase dark:text-slate-500">{group.title}</p>
          <ul className="space-y-0.5">
            {group.items.map(({ to, label, icon: Icon, end }) => (
              <li key={to}>
                <NavLink to={to} end={end} className={linkClass} onClick={onNavigate}>
                  <Icon aria-hidden="true" className="size-[18px] shrink-0" />
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  )
}

function SidebarFooter() {
  const signOut = useSignOut()
  return (
    <div className="space-y-0.5 border-t border-slate-100 px-3 py-3 dark:border-slate-800">
      <Link
        to="/"
        className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
      >
        <ExternalLink aria-hidden="true" className="size-[18px]" />
        Go to shop
      </Link>
      <button
        type="button"
        onClick={signOut}
        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-danger-600 hover:bg-danger-50 dark:text-danger-400 dark:hover:bg-danger-500/10"
      >
        <LogOut aria-hidden="true" className="size-[18px]" />
        Sign out
      </button>
    </div>
  )
}

/**
 * Layout for the merchant and admin areas: fixed sidebar on large screens,
 * a drawer opened from the top bar on small screens.
 * `groups` is already filtered to what the user may open.
 */
export default function DashboardShell({ groups, subtitle, homePath }) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const location = useLocation()
  // Close the drawer whenever the route changes (e.g. browser back button).
  const [lastPath, setLastPath] = useState(location.pathname)
  if (lastPath !== location.pathname) {
    setLastPath(location.pathname)
    setDrawerOpen(false)
  }

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[16rem_1fr]">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-slate-200 bg-white lg:flex dark:border-slate-800 dark:bg-slate-900">
        <div className="px-5 py-4">
          <Logo to={homePath} subtitle={subtitle} />
        </div>
        <div className="flex-1 overflow-y-auto">
          <SidebarNav groups={groups} />
        </div>
        <SidebarFooter />
      </aside>

      {/* Mobile drawer */}
      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title={subtitle}>
        <div className="flex h-full flex-col">
          <div className="flex-1">
            <SidebarNav groups={groups} onNavigate={() => setDrawerOpen(false)} />
          </div>
          <SidebarFooter />
        </div>
      </Drawer>

      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b border-slate-200/80 bg-white/85 px-4 backdrop-blur-md sm:px-6 dark:border-slate-800 dark:bg-slate-950/85">
          <IconButton icon={Menu} label="Open menu" className="lg:hidden" onClick={() => setDrawerOpen(true)} />
          <Logo to={homePath} subtitle={subtitle} className="lg:hidden" />
          <div className="ml-auto flex items-center gap-1">
            <ThemeToggle />
            <AccountMenu />
          </div>
        </header>
        <StatusBanner />
        <GlobalBanners />
        <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
