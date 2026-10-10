import { MessageSquare, Store } from 'lucide-react'
import { REVIEW_SORT_OPTIONS } from '@/config/catalog'
import { formatDate } from '@/utils/format'
import AsyncContent from '@/components/common/AsyncContent'
import SmartImage from '@/components/common/SmartImage'
import EmptyState from '@/components/ui/EmptyState'
import Pagination from '@/components/ui/Pagination'
import RatingStars from '@/components/ui/RatingStars'
import Select from '@/components/ui/Select'

function ReviewItem({ review }) {
  return (
    <li className="py-5 first:pt-0">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <RatingStars value={review.rating} />
        {review.variantLabel && <span className="text-xs text-slate-500 dark:text-slate-400">{review.variantLabel}</span>}
        <span className="text-xs text-slate-400">{formatDate(review.createdAt)}</span>
      </div>
      {review.text && <p className="mt-2 text-sm whitespace-pre-line text-slate-700 dark:text-slate-300">{review.text}</p>}
      {review.attachmentUrls?.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2">
          {review.attachmentUrls.map((url) => (
            <li key={url}>
              <SmartImage src={url} alt="Review photo" className="size-16 rounded-lg" />
            </li>
          ))}
        </ul>
      )}
      {review.reply?.text && (
        <div className="mt-3 rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-800/60">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
            <Store aria-hidden="true" className="size-3.5" />
            Reply from the store
            <span className="font-normal text-slate-400">· {formatDate(review.reply.createdAt)}</span>
          </p>
          <p className="mt-1 whitespace-pre-line text-slate-600 dark:text-slate-300">{review.reply.text}</p>
        </div>
      )}
    </li>
  )
}

/**
 * A paged review list with a sort select. The parent owns the data (a paged slice) and passes
 * items, pageInfo, status and callbacks.
 */
export default function ReviewList({ items, pageInfo, status, error, sort, onSortChange, onPageChange, onRetry }) {
  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {pageInfo.totalElements} review{pageInfo.totalElements === 1 ? '' : 's'}
        </p>
        <Select
          aria-label="Sort reviews"
          value={sort}
          onChange={(e) => onSortChange(e.target.value)}
          options={REVIEW_SORT_OPTIONS}
          className="h-9 w-44"
        />
      </div>
      <AsyncContent
        status={status}
        error={error}
        onRetry={onRetry}
        isEmpty={items.length === 0}
        empty={<EmptyState icon={MessageSquare} title="No reviews yet" description="Reviews appear here after customers receive their orders." />}
      >
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {items.map((review) => (
            <ReviewItem key={review.publicId} review={review} />
          ))}
        </ul>
        <Pagination {...pageInfo} onPageChange={onPageChange} />
      </AsyncContent>
    </div>
  )
}
