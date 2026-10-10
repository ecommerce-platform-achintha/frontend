import { useEffect, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { ArrowRight, Banknote, MapPin, PackageSearch, StoreIcon } from 'lucide-react'
import { fetchPublicStore, selectPublicStore, selectPublicStoreError, selectPublicStoreStatus } from '@/store/slices/publicStoresSlice'
import {
  fetchProductSearch,
  selectProductSearch,
  selectProductSearchError,
  selectProductSearchPageInfo,
  selectProductSearchQuery,
  selectProductSearchStatus,
} from '@/store/slices/productSearchSlice'
import {
  fetchStoreReviews,
  selectStoreReviews,
  selectStoreReviewsError,
  selectStoreReviewsPageInfo,
  selectStoreReviewsQuery,
  selectStoreReviewsStatus,
} from '@/store/slices/storeReviewsSlice'
import { useUrlQuery } from '@/hooks/useUrlQuery'
import AsyncContent from '@/components/common/AsyncContent'
import SmartImage from '@/components/common/SmartImage'
import ProductCard, { ProductCardSkeleton } from '@/components/catalog/ProductCard'
import ReviewList from '@/components/catalog/ReviewList'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import EmptyState from '@/components/ui/EmptyState'
import ErrorState from '@/components/ui/ErrorState'
import Pagination from '@/components/ui/Pagination'
import RatingStars from '@/components/ui/RatingStars'
import Skeleton from '@/components/ui/Skeleton'
import Tabs from '@/components/ui/Tabs'

const DEFAULTS = { tab: 'products', page: 0, rsort: 'createdAt,desc', rpage: 0 }
const TABS = [
  { value: 'products', label: 'Products' },
  { value: 'reviews', label: 'Reviews' },
]

function StoreProducts({ storePublicId, page, onPageChange }) {
  const dispatch = useDispatch()
  const items = useSelector(selectProductSearch)
  const pageInfo = useSelector(selectProductSearchPageInfo)
  const status = useSelector(selectProductSearchStatus)
  const error = useSelector(selectProductSearchError)
  const loadedFor = useSelector(selectProductSearchQuery).store

  // The same search the /search page runs, filtered by this store.
  const params = useMemo(
    () => ({ store: storePublicId, q: '', category: '', minPrice: '', maxPrice: '', inStock: '', minRating: '', sort: 'newest', page, size: 12 }),
    [storePublicId, page],
  )
  useEffect(() => {
    dispatch(fetchProductSearch(params))
  }, [dispatch, params])

  const same = loadedFor === storePublicId
  return (
    <AsyncContent
      status={same ? status : 'loading'}
      error={error}
      onRetry={() => dispatch(fetchProductSearch(params))}
      isEmpty={items.length === 0}
      skeleton={
        <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      }
      empty={<EmptyState icon={PackageSearch} title="No products yet" description="This store has not listed any products." />}
    >
      <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
        {items.map((p) => (
          <ProductCard key={p.publicId} product={p} />
        ))}
      </div>
      <Pagination {...pageInfo} onPageChange={onPageChange} />
      <div className="mt-2 text-center">
        <Button to={`/search?store=${storePublicId}`} variant="ghost" rightIcon={ArrowRight}>
          Search and filter this store
        </Button>
      </div>
    </AsyncContent>
  )
}

function StoreReviews({ storePublicId, sort, page, setQuery }) {
  const dispatch = useDispatch()
  const items = useSelector(selectStoreReviews)
  const pageInfo = useSelector(selectStoreReviewsPageInfo)
  const status = useSelector(selectStoreReviewsStatus)
  const error = useSelector(selectStoreReviewsError)
  const loadedFor = useSelector(selectStoreReviewsQuery).storePublicId

  const params = useMemo(() => ({ storePublicId, sort, page, size: 5 }), [storePublicId, sort, page])
  useEffect(() => {
    dispatch(fetchStoreReviews(params))
  }, [dispatch, params])

  const same = loadedFor === storePublicId
  return (
    <ReviewList
      items={same ? items : []}
      pageInfo={pageInfo}
      status={same ? status : 'loading'}
      error={error}
      sort={sort}
      onSortChange={(rsort) => setQuery({ rsort, rpage: 0 }, { resetPage: false, replace: true })}
      onPageChange={(rpage) => setQuery({ rpage }, { resetPage: false })}
      onRetry={() => dispatch(fetchStoreReviews(params))}
    />
  )
}

export default function StorePage() {
  const { publicId } = useParams()
  const dispatch = useDispatch()
  const [query, setQuery] = useUrlQuery(DEFAULTS)
  const store = useSelector((s) => selectPublicStore(s, publicId))
  const status = useSelector((s) => selectPublicStoreStatus(s, publicId))
  const error = useSelector((s) => selectPublicStoreError(s, publicId))

  useEffect(() => {
    dispatch(fetchPublicStore(publicId))
  }, [dispatch, publicId])

  if (!store && status === 'failed') {
    if (error?.status === 404) {
      return (
        <EmptyState
          icon={StoreIcon}
          title="This store is not available"
          description="It may have closed or is not selling right now."
          action={<Button to="/stores">Browse stores</Button>}
        />
      )
    }
    return <ErrorState error={error} onRetry={() => dispatch(fetchPublicStore(publicId))} />
  }

  const place = store ? [store.city, store.district].filter(Boolean).join(', ') : ''

  return (
    <>
      <Card className="mb-8 overflow-hidden">
        <div className="h-24 bg-gradient-to-r from-primary-500 to-primary-700 sm:h-32 dark:from-primary-700 dark:to-slate-800" />
        <div className="flex flex-col gap-4 px-5 pb-6 sm:flex-row sm:items-end sm:px-8">
          {store ? (
            <SmartImage
              src={store.logoUrl}
              alt=""
              name={store.name}
              className="-mt-10 size-20 shrink-0 rounded-2xl ring-4 ring-white sm:size-24 dark:ring-slate-900"
            />
          ) : (
            <Skeleton className="-mt-10 size-20 rounded-2xl sm:size-24" />
          )}
          <div className="min-w-0 flex-1">
            {store ? (
              <>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{store.name}</h1>
                <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-500 dark:text-slate-400">
                  {place && (
                    <span className="flex items-center gap-1">
                      <MapPin aria-hidden="true" className="size-4" />
                      {place}
                    </span>
                  )}
                  <RatingStars value={store.ratingAvg ?? 0} count={store.ratingCount ?? 0} />
                  {store.codEnabled && (
                    <Badge tone="primary" icon={Banknote}>
                      Cash on delivery
                    </Badge>
                  )}
                </div>
              </>
            ) : (
              <div className="space-y-2">
                <Skeleton className="h-7 w-48" />
                <Skeleton className="h-4 w-64" />
              </div>
            )}
          </div>
        </div>
        {store?.description && (
          <p className="border-t border-slate-100 px-5 py-4 text-sm whitespace-pre-line text-slate-600 sm:px-8 dark:border-slate-800 dark:text-slate-300">
            {store.description}
          </p>
        )}
      </Card>

      <Tabs tabs={TABS} value={query.tab} onChange={(tab) => setQuery({ tab }, { resetPage: false, replace: true })}>
        {query.tab === 'reviews' ? (
          <StoreReviews storePublicId={publicId} sort={query.rsort} page={query.rpage} setQuery={setQuery} />
        ) : (
          <StoreProducts storePublicId={publicId} page={query.page} onPageChange={(page) => setQuery({ page }, { resetPage: false })} />
        )}
      </Tabs>
    </>
  )
}
