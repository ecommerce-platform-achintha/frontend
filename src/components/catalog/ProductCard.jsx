import { Link } from 'react-router-dom'
import SmartImage from '@/components/common/SmartImage'
import Badge from '@/components/ui/Badge'
import PriceTag from '@/components/ui/PriceTag'
import RatingStars from '@/components/ui/RatingStars'
import Skeleton from '@/components/ui/Skeleton'
import { cn } from '@/utils/cn'

/**
 * Product search result (GET /api/public/products item).
 * layout="responsive": a row on mobile, a card from `sm` up. layout="card": always a card.
 */
export default function ProductCard({ product, layout = 'responsive' }) {
  const responsive = layout === 'responsive'
  return (
    <Link
      to={`/products/${product.publicId}`}
      className={cn(
        'group flex overflow-hidden rounded-[var(--radius-card)] border border-slate-200/70 bg-white shadow-soft transition hover:-translate-y-0.5 hover:shadow-card dark:border-slate-800 dark:bg-slate-900',
        responsive ? 'flex-row sm:flex-col' : 'flex-col',
      )}
    >
      <div className={cn('relative shrink-0', responsive ? 'w-28 sm:w-full' : 'w-full')}>
        <SmartImage
          src={product.imageUrl}
          alt=""
          name={product.name}
          className={cn('w-full', responsive ? 'h-full min-h-28 sm:aspect-square sm:h-auto' : 'aspect-square')}
          imgClassName="transition duration-300 group-hover:scale-105"
        />
        {!product.inStock && (
          <Badge tone="neutral" className="absolute top-2 left-2 bg-white/90 dark:bg-slate-900/90">
            Out of stock
          </Badge>
        )}
        {product.discounted && product.inStock && (
          <Badge tone="danger" className="absolute top-2 left-2">
            Sale
          </Badge>
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1 p-3 sm:p-4">
        <p className="truncate text-xs text-slate-500 dark:text-slate-400">{product.store?.name}</p>
        <h3 className="line-clamp-2 text-sm font-medium text-slate-900 group-hover:text-primary-700 dark:text-slate-100 dark:group-hover:text-primary-300">
          {product.name}
        </h3>
        <div className="mt-auto space-y-1 pt-1">
          <PriceTag price={product.price} listPrice={product.listPrice} discounted={product.discounted} from size="sm" />
          {product.ratingCount > 0 && <RatingStars value={product.ratingAvg} count={product.ratingCount} />}
        </div>
      </div>
    </Link>
  )
}

export function ProductCardSkeleton({ layout = 'responsive' }) {
  const responsive = layout === 'responsive'
  return (
    <div
      className={cn(
        'flex overflow-hidden rounded-[var(--radius-card)] border border-slate-200/70 bg-white dark:border-slate-800 dark:bg-slate-900',
        responsive ? 'flex-row sm:flex-col' : 'flex-col',
      )}
    >
      <Skeleton className={cn('rounded-none', responsive ? 'h-28 w-28 sm:aspect-square sm:h-auto sm:w-full' : 'aspect-square w-full')} />
      <div className="flex-1 space-y-2 p-4">
        <Skeleton className="h-3 w-1/3" />
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    </div>
  )
}
