import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { Banknote, PackageX, ShoppingCart, Store, Truck } from 'lucide-react'
import * as catalogApi from '@/api/catalog'
import { addToCart } from '@/store/slices/cartSlice'
import {
  fetchProductReviews,
  selectProductReviews,
  selectProductReviewsError,
  selectProductReviewsPageInfo,
  selectProductReviewsQuery,
  selectProductReviewsStatus,
} from '@/store/slices/productReviewsSlice'
import { errorMessage } from '@/config/errorMessages'
import { useAsync } from '@/hooks/useAsync'
import { useToast } from '@/hooks/useToast'
import { useUrlQuery } from '@/hooks/useUrlQuery'
import { formatDate } from '@/utils/format'
import { findVariant, initialSelection } from '@/utils/variants'
import ShopperButton from '@/components/common/ShopperButton'
import Gallery from '@/components/catalog/Gallery'
import ReviewList from '@/components/catalog/ReviewList'
import VariantPicker from '@/components/catalog/VariantPicker'
import Badge from '@/components/ui/Badge'
import Breadcrumbs from '@/components/ui/Breadcrumbs'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import EmptyState from '@/components/ui/EmptyState'
import ErrorState from '@/components/ui/ErrorState'
import PriceTag from '@/components/ui/PriceTag'
import QuantityStepper from '@/components/ui/QuantityStepper'
import RatingStars from '@/components/ui/RatingStars'
import Skeleton from '@/components/ui/Skeleton'

const REVIEW_DEFAULTS = { rsort: 'createdAt,desc', rpage: 0 }

function ProductSkeleton() {
  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <Skeleton className="aspect-square w-full rounded-[var(--radius-card)]" />
      <div className="space-y-4">
        <Skeleton className="h-4 w-1/4" />
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-6 w-1/3" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    </div>
  )
}

function StockText({ variant }) {
  if (!variant) return <p className="text-sm text-slate-500">Choose the options above.</p>
  // No stock numbers are ever shown (the API does not expose them).
  if (!variant.inStock) return <Badge tone="neutral">Out of stock</Badge>
  if (variant.lowStock) return <Badge tone="warning">Only a few left</Badge>
  return <Badge tone="success">In stock</Badge>
}

function ProductReviews({ productPublicId }) {
  const dispatch = useDispatch()
  const [query, setQuery] = useUrlQuery(REVIEW_DEFAULTS)
  const items = useSelector(selectProductReviews)
  const pageInfo = useSelector(selectProductReviewsPageInfo)
  const status = useSelector(selectProductReviewsStatus)
  const error = useSelector(selectProductReviewsError)
  const loadedFor = useSelector(selectProductReviewsQuery).productPublicId

  const params = useMemo(
    () => ({ productPublicId, sort: query.rsort, page: query.rpage, size: 5 }),
    [productPublicId, query.rsort, query.rpage],
  )
  useEffect(() => {
    dispatch(fetchProductReviews(params))
  }, [dispatch, params])

  // Do not flash another product's reviews while switching products.
  const sameProduct = loadedFor === productPublicId
  return (
    <ReviewList
      items={sameProduct ? items : []}
      pageInfo={pageInfo}
      status={sameProduct ? status : 'loading'}
      error={error}
      sort={query.rsort}
      onSortChange={(rsort) => setQuery({ rsort, rpage: 0 }, { resetPage: false, replace: true })}
      onPageChange={(rpage) => setQuery({ rpage }, { resetPage: false })}
      onRetry={() => dispatch(fetchProductReviews(params))}
    />
  )
}

function ProductDetail({ product }) {
  const dispatch = useDispatch()
  const toast = useToast()
  const [selection, setSelection] = useState(() => initialSelection(product))
  const [quantity, setQuantity] = useState(1)
  const [adding, setAdding] = useState(false)

  const variant = findVariant(product, selection)
  const images = variant?.imageUrls?.length ? [...variant.imageUrls, ...(product.imageUrls ?? [])] : (product.imageUrls ?? [])
  const canBuy = Boolean(variant?.inStock)

  const add = async () => {
    if (!variant) return
    setAdding(true)
    try {
      await dispatch(addToCart({ variantPublicId: variant.publicId, quantity })).unwrap()
      toast.success(`${product.name} was added to your cart.`, 'Added to cart', { action: { label: 'View cart', to: '/cart' } })
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setAdding(false)
    }
  }

  return (
    <>
      <Breadcrumbs
        items={[
          { label: 'Home', to: '/' },
          product.category && { label: product.category.name, to: `/search?category=${encodeURIComponent(product.category.slug)}` },
          { label: product.name },
        ].filter(Boolean)}
      />

      <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
        <Gallery images={images} name={product.name} />

        <div className="space-y-6">
          <div>
            {product.store && (
              <Link
                to={`/stores/${product.store.publicId}`}
                className="text-sm font-medium text-primary-700 hover:underline dark:text-primary-300"
              >
                {product.store.name}
              </Link>
            )}
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-white">{product.name}</h1>
            {product.ratingCount > 0 && <RatingStars value={product.ratingAvg} count={product.ratingCount} className="mt-2" />}
          </div>

          <div className="space-y-2">
            {variant ? (
              <PriceTag price={variant.effectivePrice} listPrice={variant.listPrice} discounted={Boolean(variant.discount)} size="lg" />
            ) : (
              <PriceTag price={product.price} listPrice={product.listPrice} discounted={product.discounted} from size="lg" />
            )}
            {variant?.discount && (
              <p className="text-sm text-danger-700 dark:text-danger-300">
                {variant.discount.name || 'Discount'}
                {variant.discount.endsAt && <span className="text-slate-500 dark:text-slate-400"> · ends {formatDate(variant.discount.endsAt)}</span>}
              </p>
            )}
          </div>

          <VariantPicker product={product} selection={selection} onChange={setSelection} />

          <div className="flex items-center gap-3">
            <StockText variant={variant} />
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <QuantityStepper value={quantity} onChange={setQuantity} min={1} max={100} disabled={!canBuy} />
            <ShopperButton
              size="lg"
              leftIcon={ShoppingCart}
              onClick={add}
              loading={adding}
              disabled={!canBuy}
              className="sm:flex-1"
              fullWidth
            >
              {canBuy ? 'Add to cart' : 'Out of stock'}
            </ShopperButton>
          </div>

          <ul className="space-y-2 rounded-xl bg-slate-50 p-4 text-sm text-slate-600 dark:bg-slate-900 dark:text-slate-300">
            <li className="flex items-start gap-2">
              <Banknote aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
              {product.codAllowed ? 'Cash on delivery available (if the store offers it).' : 'Bank transfer only for this product.'}
            </li>
            <li className="flex items-start gap-2">
              <Truck aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
              The store confirms availability and quotes delivery before you pay.
            </li>
          </ul>

          {product.store && (
            <Card className="flex items-center justify-between gap-3 p-4">
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-xl bg-primary-50 text-primary-700 dark:bg-primary-500/15 dark:text-primary-200">
                  <Store aria-hidden="true" className="size-5" />
                </span>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Sold by</p>
                  <p className="font-semibold text-slate-900 dark:text-white">{product.store.name}</p>
                </div>
              </div>
              <Button to={`/stores/${product.store.publicId}`} variant="outline" size="sm">
                Visit store
              </Button>
            </Card>
          )}
        </div>
      </div>

      {product.description && (
        <Card className="mt-10">
          <Card.Header title="About this product" />
          <Card.Body>
            <p className="text-sm leading-relaxed whitespace-pre-line text-slate-700 dark:text-slate-300">{product.description}</p>
          </Card.Body>
        </Card>
      )}

      <Card className="mt-6">
        <Card.Header title="Reviews" />
        <Card.Body>
          <ProductReviews productPublicId={product.publicId} />
        </Card.Body>
      </Card>
    </>
  )
}

export default function ProductPage() {
  const { publicId } = useParams()
  const { data, error, status, reload } = useAsync(() => catalogApi.getPublicProduct(publicId), publicId)

  if (status === 'loading' || status === 'idle') return <ProductSkeleton />
  if (status === 'failed') {
    // 404 also happens when the store was hidden (contract 10.9).
    if (error?.status === 404) {
      return (
        <EmptyState
          icon={PackageX}
          title="This product is no longer available"
          description="It may have been removed or the store is not selling right now."
          action={<Button to="/search">Back to search</Button>}
        />
      )
    }
    return <ErrorState error={error} onRetry={reload} />
  }
  // `key` resets the variant picker when another product opens.
  return <ProductDetail key={data.publicId} product={data} />
}
