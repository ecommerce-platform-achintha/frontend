import { useCallback, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { ArrowRight, Sparkles } from 'lucide-react'
import * as catalogApi from '@/api/catalog'
import * as storesApi from '@/api/stores'
import { fetchCategories, selectCategoryTree } from '@/store/slices/categoriesSlice'
import { useAsync } from '@/hooks/useAsync'
import ProductCard, { ProductCardSkeleton } from '@/components/catalog/ProductCard'
import StoreCard, { StoreCardSkeleton } from '@/components/catalog/StoreCard'
import SearchInput from '@/components/ui/SearchInput'

// Each row is one public query. Rows with no data (or a failed load) are hidden.
const PRODUCT_ROWS = [
  { title: 'New arrivals', params: { sort: 'newest' }, link: '/search?sort=newest' },
  { title: 'Top rated', params: { sort: 'rating' }, link: '/search?sort=rating' },
  { title: 'In stock now', params: { inStock: true }, link: '/search?inStock=true' },
]

function SectionHeader({ title, link }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">{title}</h2>
      <Link to={link} className="flex items-center gap-1 text-sm font-semibold text-primary-700 hover:underline dark:text-primary-300">
        See all <ArrowRight aria-hidden="true" className="size-4" />
      </Link>
    </div>
  )
}

function ProductRow({ title, params, link }) {
  const key = JSON.stringify(params)
  const { data, status } = useAsync(() => catalogApi.searchProducts({ ...params, page: 0, size: 8 }), key)
  const items = data?.content ?? []
  if (status === 'failed' || (status === 'succeeded' && items.length === 0)) return null
  return (
    <section>
      <SectionHeader title={title} link={link} />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
        {status === 'loading'
          ? Array.from({ length: 4 }, (_, i) => <ProductCardSkeleton key={i} layout="card" />)
          : items.map((p) => <ProductCard key={p.publicId} product={p} layout="card" />)}
      </div>
    </section>
  )
}

function StoresRow() {
  const { data, status } = useAsync(() => storesApi.listPublicStores({ sort: 'rating,desc', page: 0, size: 6 }), 'stores')
  const items = data?.content ?? []
  if (status === 'failed' || (status === 'succeeded' && items.length === 0)) return null
  return (
    <section>
      <SectionHeader title="Popular stores" link="/stores?sort=rating%2Cdesc" />
      <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
        {status === 'loading'
          ? Array.from({ length: 3 }, (_, i) => <StoreCardSkeleton key={i} />)
          : items.map((s) => <StoreCard key={s.publicId} store={s} />)}
      </div>
    </section>
  )
}

export default function HomePage() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const categories = useSelector(selectCategoryTree)

  useEffect(() => {
    dispatch(fetchCategories())
  }, [dispatch])

  const onSearch = useCallback((text) => text && navigate(`/search?q=${encodeURIComponent(text)}`), [navigate])

  return (
    <div className="space-y-12">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary-600 to-primary-800 px-6 py-12 text-white shadow-card sm:px-12 sm:py-16 dark:from-primary-700 dark:to-slate-900">
        <div aria-hidden="true" className="absolute -top-16 -right-16 size-64 rounded-full bg-white/10 blur-2xl" />
        <div className="relative max-w-2xl">
          <p className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
            <Sparkles aria-hidden="true" className="size-3.5" />
            Local stores across Sri Lanka
          </p>
          <h1 className="text-3xl font-bold tracking-tight sm:text-5xl">Find it. Order it. Pay when it suits you.</h1>
          <p className="mt-3 text-base text-primary-100 sm:text-lg">
            Every store confirms your order and delivery cost before you pay. Cash on delivery where available.
          </p>
          <SearchInput
            onSearch={onSearch}
            placeholder="Search for products"
            className="mt-8 [&_input]:h-14 [&_input]:text-base [&_input]:shadow-pop"
          />
        </div>
      </section>

      {categories.length > 0 && (
        <section aria-label="Categories">
          <ul className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
            {categories.map((c) => (
              <li key={c.slug} className="shrink-0">
                <Link
                  to={`/search?category=${encodeURIComponent(c.slug)}`}
                  className="inline-flex h-10 items-center rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-primary-500 dark:hover:bg-primary-500/10 dark:hover:text-primary-200"
                >
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {PRODUCT_ROWS.map((row) => (
        <ProductRow key={row.title} {...row} />
      ))}
      <StoresRow />
    </div>
  )
}
