import { Link } from 'react-router-dom'
import { MapPin } from 'lucide-react'
import SmartImage from '@/components/common/SmartImage'
import Badge from '@/components/ui/Badge'
import RatingStars from '@/components/ui/RatingStars'
import Skeleton from '@/components/ui/Skeleton'

// Public store item: publicId, name, description, city, district, logoUrl, ratingAvg, ratingCount, codEnabled.
export default function StoreCard({ store }) {
  const place = [store.city, store.district].filter(Boolean).join(', ')
  return (
    <Link
      to={`/stores/${store.publicId}`}
      className="group flex gap-4 rounded-[var(--radius-card)] border border-slate-200/70 bg-white p-4 shadow-soft transition hover:-translate-y-0.5 hover:shadow-card dark:border-slate-800 dark:bg-slate-900"
    >
      <SmartImage src={store.logoUrl} alt="" name={store.name} className="size-16 shrink-0 rounded-2xl" />
      <div className="min-w-0 flex-1">
        <h3 className="truncate font-semibold text-slate-900 group-hover:text-primary-700 dark:text-white dark:group-hover:text-primary-300">
          {store.name}
        </h3>
        {place && (
          <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-slate-500 dark:text-slate-400">
            <MapPin aria-hidden="true" className="size-3.5 shrink-0" />
            {place}
          </p>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <RatingStars value={store.ratingAvg ?? 0} count={store.ratingCount ?? 0} />
          {store.codEnabled && <Badge tone="primary">Cash on delivery</Badge>}
        </div>
      </div>
    </Link>
  )
}

export function StoreCardSkeleton() {
  return (
    <div className="flex gap-4 rounded-[var(--radius-card)] border border-slate-200/70 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <Skeleton className="size-16 rounded-2xl" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-3 w-1/3" />
        <Skeleton className="h-3 w-2/5" />
      </div>
    </div>
  )
}
