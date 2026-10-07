import { Link, Outlet } from 'react-router-dom'
import StatusBanner from '@/components/common/StatusBanner'
import GlobalBanners from '@/components/common/GlobalBanners'
import PublicHeader from './PublicHeader'

// Shop pages: header, banners, page content, footer.
export default function PublicLayout() {
  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-white focus:px-3 focus:py-2">
        Skip to content
      </a>
      <PublicHeader />
      <StatusBanner />
      <GlobalBanners />
      <main id="main" className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <Outlet />
      </main>
      <footer className="border-t border-slate-200 py-8 text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p>© {new Date().getFullYear()} Marketplace · Prices in LKR</p>
          <nav aria-label="Footer" className="flex gap-4">
            <Link to="/stores" className="hover:text-slate-900 dark:hover:text-white">
              Stores
            </Link>
            <Link to="/register/merchant" className="hover:text-slate-900 dark:hover:text-white">
              Sell on Marketplace
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  )
}
