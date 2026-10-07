import { useCallback, useEffect } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { ShoppingCart, Store } from 'lucide-react'
import { fetchCart, selectCartLineCount } from '@/store/slices/cartSlice'
import { usePermissions } from '@/hooks/usePermissions'
import Logo from '@/components/common/Logo'
import ThemeToggle from '@/components/common/ThemeToggle'
import SearchInput from '@/components/ui/SearchInput'
import AccountMenu from './AccountMenu'
import CategoriesMenu from './CategoriesMenu'

function CartLink() {
  const count = useSelector(selectCartLineCount)
  return (
    <Link
      to="/cart"
      className="relative flex size-11 items-center justify-center rounded-xl text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
      aria-label={count ? `Cart, ${count} items` : 'Cart'}
    >
      <ShoppingCart aria-hidden="true" className="size-5" />
      {count > 0 && (
        <span className="absolute top-1 right-1 flex min-w-5 items-center justify-center rounded-full bg-primary-600 px-1 text-[11px] leading-5 font-bold text-white tabular-nums dark:bg-primary-500">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Link>
  )
}

export default function PublicHeader() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  const [params] = useSearchParams()
  const { isCustomer } = usePermissions()
  // Keep the box in sync with the URL only on the search page.
  const currentQuery = location.pathname === '/search' ? (params.get('q') ?? '') : ''

  useEffect(() => {
    if (isCustomer) dispatch(fetchCart())
  }, [dispatch, isCustomer])

  const onSearch = useCallback(
    (text) => {
      if (!text && location.pathname !== '/search') return
      const next = new URLSearchParams(location.pathname === '/search' ? params : undefined)
      if (text) next.set('q', text)
      else next.delete('q')
      next.delete('page')
      navigate(`/search?${next.toString()}`)
    },
    [navigate, location.pathname, params],
  )

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/85 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/85">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-2 gap-y-2 px-4 py-2.5 sm:px-6 lg:flex-nowrap lg:gap-4 lg:px-8">
        <Logo className="mr-1 shrink-0" />
        <CategoriesMenu />
        {/* Full-width search on mobile (second row), inline on large screens. */}
        <SearchInput
          value={currentQuery}
          onSearch={onSearch}
          placeholder="Search products"
          className="order-last w-full lg:order-none lg:max-w-xl lg:flex-1"
        />
        <nav aria-label="Account" className="ml-auto flex items-center gap-1">
          <Link
            to="/stores"
            className="hidden h-11 items-center gap-2 rounded-xl px-3 text-sm font-medium text-slate-700 hover:bg-slate-100 md:flex dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <Store aria-hidden="true" className="size-4" />
            Stores
          </Link>
          <ThemeToggle />
          {isCustomer && <CartLink />}
          <AccountMenu />
        </nav>
      </div>
    </header>
  )
}
