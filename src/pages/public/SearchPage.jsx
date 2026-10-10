import { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { SearchX, SlidersHorizontal, X } from 'lucide-react'
import {
  fetchProductSearch,
  selectProductSearch,
  selectProductSearchError,
  selectProductSearchPageInfo,
  selectProductSearchStatus,
} from '@/store/slices/productSearchSlice'
import { fetchPublicStore, selectPublicStore } from '@/store/slices/publicStoresSlice'
import { selectCategories } from '@/store/slices/categoriesSlice'
import { MIN_RATING_OPTIONS, PRODUCT_PAGE_SIZES, PRODUCT_SORT_OPTIONS } from '@/config/catalog'
import { useUrlQuery } from '@/hooks/useUrlQuery'
import { isPublicId } from '@/utils/ids'
import { validateMoney } from '@/utils/validators'
import AsyncContent from '@/components/common/AsyncContent'
import PageHeader from '@/components/common/PageHeader'
import CategorySelect from '@/components/catalog/CategorySelect'
import ProductCard, { ProductCardSkeleton } from '@/components/catalog/ProductCard'
import Button from '@/components/ui/Button'
import Checkbox from '@/components/ui/Checkbox'
import Drawer from '@/components/ui/Drawer'
import EmptyState from '@/components/ui/EmptyState'
import FormField from '@/components/ui/FormField'
import MoneyInput from '@/components/ui/MoneyInput'
import Pagination from '@/components/ui/Pagination'
import Select from '@/components/ui/Select'

const DEFAULTS = {
  q: '',
  category: '',
  store: '',
  minPrice: '',
  maxPrice: '',
  inStock: '',
  minRating: '',
  sort: 'relevance',
  page: 0,
  size: 24,
}

// URL query -> API params (contract 7.3). Empty values are dropped by the paged resource.
function toApiParams(query) {
  return {
    q: query.q.slice(0, 100),
    category: query.category,
    store: isPublicId(query.store, 'STR') ? query.store : '',
    minPrice: query.minPrice,
    maxPrice: query.maxPrice,
    inStock: query.inStock === 'true' ? true : '',
    minRating: query.minRating,
    sort: PRODUCT_SORT_OPTIONS.some((o) => o.value === query.sort) ? query.sort : 'relevance',
    page: Math.max(0, query.page),
    size: PRODUCT_PAGE_SIZES.includes(query.size) ? query.size : DEFAULTS.size,
  }
}

function Filters({ query, setQuery, onApplied }) {
  const [price, setPrice] = useState({ min: query.minPrice, max: query.maxPrice })
  const [priceError, setPriceError] = useState('')

  // Follow the URL when it changes elsewhere (back button, chip removed).
  const [lastUrlPrice, setLastUrlPrice] = useState(`${query.minPrice}|${query.maxPrice}`)
  if (lastUrlPrice !== `${query.minPrice}|${query.maxPrice}`) {
    setLastUrlPrice(`${query.minPrice}|${query.maxPrice}`)
    setPrice({ min: query.minPrice, max: query.maxPrice })
  }

  const applyPrice = (event) => {
    event.preventDefault()
    const problem =
      validateMoney(price.min, { required: false, allowZero: true }) ||
      validateMoney(price.max, { required: false, allowZero: true }) ||
      (price.min && price.max && Number(price.min) > Number(price.max) ? 'The minimum is higher than the maximum.' : '')
    setPriceError(problem)
    if (problem) return
    setQuery({ minPrice: price.min, maxPrice: price.max })
    onApplied?.()
  }

  return (
    <div className="space-y-6">
      <FormField label="Category">
        <CategorySelect
          value={query.category}
          onChange={(category) => {
            setQuery({ category })
            onApplied?.()
          }}
        />
      </FormField>

      <form onSubmit={applyPrice} className="space-y-2" noValidate>
        <p className="text-sm font-medium text-slate-800 dark:text-slate-200">Price</p>
        <div className="grid grid-cols-2 gap-2">
          <MoneyInput aria-label="Minimum price" placeholder="Min" value={price.min} onChange={(min) => setPrice((p) => ({ ...p, min }))} />
          <MoneyInput aria-label="Maximum price" placeholder="Max" value={price.max} onChange={(max) => setPrice((p) => ({ ...p, max }))} />
        </div>
        {priceError && (
          <p role="alert" className="text-xs font-medium text-danger-600 dark:text-danger-400">
            {priceError}
          </p>
        )}
        <Button type="submit" variant="outline" size="sm" fullWidth>
          Apply price
        </Button>
      </form>

      <FormField label="Rating">
        <Select
          value={query.minRating}
          onChange={(e) => {
            setQuery({ minRating: e.target.value })
            onApplied?.()
          }}
          options={MIN_RATING_OPTIONS}
        />
      </FormField>

      <Checkbox
        label="In stock only"
        checked={query.inStock === 'true'}
        onChange={(e) => setQuery({ inStock: e.target.checked ? 'true' : '' })}
      />
    </div>
  )
}

function Chip({ label, onRemove }) {
  return (
    <span className="inline-flex h-8 items-center gap-1 rounded-full bg-primary-50 pr-1 pl-3 text-sm font-medium text-primary-800 dark:bg-primary-500/15 dark:text-primary-200">
      {label}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove filter ${label}`}
        className="flex size-6 items-center justify-center rounded-full hover:bg-primary-100 dark:hover:bg-primary-500/25"
      >
        <X aria-hidden="true" className="size-3.5" />
      </button>
    </span>
  )
}

export default function SearchPage() {
  const dispatch = useDispatch()
  const [query, setQuery] = useUrlQuery(DEFAULTS)
  const apiParams = useMemo(() => toApiParams(query), [query])
  const items = useSelector(selectProductSearch)
  const pageInfo = useSelector(selectProductSearchPageInfo)
  const status = useSelector(selectProductSearchStatus)
  const error = useSelector(selectProductSearchError)
  const categories = useSelector(selectCategories)
  const store = useSelector((state) => (apiParams.store ? selectPublicStore(state, apiParams.store) : null))
  const [filtersOpen, setFiltersOpen] = useState(false)

  useEffect(() => {
    dispatch(fetchProductSearch(apiParams))
  }, [dispatch, apiParams])

  // Load the store name for the "store" chip.
  useEffect(() => {
    if (apiParams.store) dispatch(fetchPublicStore(apiParams.store))
  }, [dispatch, apiParams.store])

  const categoryName = categories.find((c) => c.slug === query.category)?.name ?? query.category
  const chips = [
    query.q && { key: 'q', label: `“${query.q}”`, clear: { q: '' } },
    query.category && { key: 'category', label: categoryName, clear: { category: '' } },
    apiParams.store && { key: 'store', label: `Store: ${store?.name ?? apiParams.store}`, clear: { store: '' } },
    (query.minPrice || query.maxPrice) && {
      key: 'price',
      label: `LKR ${query.minPrice || '0'} – ${query.maxPrice || 'any'}`,
      clear: { minPrice: '', maxPrice: '' },
    },
    query.minRating && { key: 'rating', label: `${query.minRating}+ stars`, clear: { minRating: '' } },
    query.inStock === 'true' && { key: 'stock', label: 'In stock', clear: { inStock: '' } },
  ].filter(Boolean)

  const title = query.q ? `Results for “${query.q}”` : store ? `Products from ${store.name}` : 'All products'

  return (
    <>
      <PageHeader
        title={title}
        description={status === 'succeeded' ? `${pageInfo.totalElements} product${pageInfo.totalElements === 1 ? '' : 's'}` : undefined}
      />

      <div className="lg:grid lg:grid-cols-[16rem_1fr] lg:gap-8">
        <aside className="hidden lg:block" aria-label="Filters">
          <div className="sticky top-24">
            <Filters query={query} setQuery={setQuery} />
          </div>
        </aside>

        <Drawer
          open={filtersOpen}
          onClose={() => setFiltersOpen(false)}
          title="Filters"
          side="bottom"
          footer={
            <Button fullWidth onClick={() => setFiltersOpen(false)}>
              Show results
            </Button>
          }
        >
          <div className="p-4">
            <Filters query={query} setQuery={setQuery} />
          </div>
        </Drawer>

        <section aria-label="Results" className="min-w-0">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" leftIcon={SlidersHorizontal} className="lg:hidden" onClick={() => setFiltersOpen(true)}>
              Filters{chips.length ? ` (${chips.length})` : ''}
            </Button>
            <div className="ml-auto flex items-center gap-2">
              <Select
                aria-label="Sort by"
                value={apiParams.sort}
                onChange={(e) => setQuery({ sort: e.target.value })}
                options={PRODUCT_SORT_OPTIONS}
                className="h-9 w-48"
              />
            </div>
          </div>

          {chips.length > 0 && (
            <div className="mb-4 flex flex-wrap items-center gap-2">
              {chips.map((chip) => (
                <Chip key={chip.key} label={chip.label} onRemove={() => setQuery(chip.clear)} />
              ))}
              <button
                type="button"
                className="text-sm font-medium text-slate-500 underline-offset-2 hover:underline"
                onClick={() => setQuery({ q: '', category: '', store: '', minPrice: '', maxPrice: '', inStock: '', minRating: '' })}
              >
                Clear all
              </button>
            </div>
          )}

          <AsyncContent
            status={status}
            error={error}
            onRetry={() => dispatch(fetchProductSearch(apiParams))}
            isEmpty={items.length === 0}
            skeleton={
              <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
                {Array.from({ length: 6 }, (_, i) => (
                  <ProductCardSkeleton key={i} />
                ))}
              </div>
            }
            empty={
              <EmptyState
                icon={SearchX}
                title="No products found"
                description="Try fewer filters or a different word."
                action={
                  chips.length > 0 && (
                    <Button variant="outline" onClick={() => setQuery({ q: '', category: '', minPrice: '', maxPrice: '', inStock: '', minRating: '' })}>
                      Clear filters
                    </Button>
                  )
                }
              />
            }
          >
            <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
              {items.map((product) => (
                <ProductCard key={product.publicId} product={product} />
              ))}
            </div>
            <Pagination
              {...pageInfo}
              sizeOptions={PRODUCT_PAGE_SIZES}
              onPageChange={(page) => setQuery({ page }, { resetPage: false })}
              onSizeChange={(size) => setQuery({ size })}
            />
          </AsyncContent>
        </section>
      </div>
    </>
  )
}
