import { Eye, EyeOff, MessageSquare, Store } from 'lucide-react'
import * as adminApi from '@/api/admin'
import { ADMIN_PAGE_SIZE_OPTIONS } from '@/config/constants'
import { useActionDialog } from '@/hooks/useActionDialog'
import { formatDate, formatDateTime } from '@/utils/format'
import AsyncContent from '@/components/common/AsyncContent'
import SmartImage from '@/components/common/SmartImage'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import EmptyState from '@/components/ui/EmptyState'
import Pagination from '@/components/ui/Pagination'
import RatingStars from '@/components/ui/RatingStars'

const API = {
  store: { hide: adminApi.hideStoreReview, unhide: adminApi.unhideStoreReview },
  product: { hide: adminApi.hideProductReview, unhide: adminApi.unhideProductReview },
}

/*
 * The contract says admin review lists include hidden reviews but does not name the fields.
 * We read `hidden`, `hiddenReason` (or `hideReason`) and `hiddenAt`; missing ones are not shown.
 */
function ReviewRow({ review, onHide, onUnhide }) {
  const reason = review.hiddenReason ?? review.hideReason
  return (
    <li className="py-4 first:pt-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <RatingStars value={review.rating} />
            {review.hidden && <Badge tone="warning">Hidden</Badge>}
            {review.variantLabel && <span className="text-xs text-slate-500">{review.variantLabel}</span>}
            <span className="text-xs text-slate-400">
              {review.publicId} · {formatDate(review.createdAt)}
            </span>
          </div>
          {review.hidden && (reason || review.hiddenAt) && (
            <p className="mt-1 text-xs text-warning-800 dark:text-warning-300">
              Hidden{review.hiddenAt ? ` ${formatDateTime(review.hiddenAt)}` : ''}
              {reason ? `: ${reason}` : ''}
            </p>
          )}
          {review.text && <p className="mt-2 text-sm whitespace-pre-line text-slate-700 dark:text-slate-300">{review.text}</p>}
          {review.attachmentUrls?.length > 0 && (
            <ul className="mt-2 flex flex-wrap gap-2">
              {review.attachmentUrls.map((url) => (
                <li key={url}>
                  <SmartImage src={url} alt="Review photo" className="size-14 rounded-lg" />
                </li>
              ))}
            </ul>
          )}
          {review.reply?.text && (
            <p className="mt-2 flex gap-1.5 rounded-lg bg-slate-50 p-2 text-xs text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
              <Store aria-hidden="true" className="size-3.5 shrink-0" /> {review.reply.text}
            </p>
          )}
        </div>
        {review.hidden ? (
          <Button variant="outline" size="sm" leftIcon={Eye} onClick={() => onUnhide(review)}>
            Unhide
          </Button>
        ) : (
          <Button variant="outline" size="sm" leftIcon={EyeOff} onClick={() => onHide(review)}>
            Hide
          </Button>
        )}
      </div>
    </li>
  )
}

/**
 * A paged review list with Hide / Unhide (reason required). `kind`: 'store' | 'product'.
 * The parent owns the data and passes the paged list state plus `onChanged` to reload.
 */
export default function ReviewModeration({ kind, items, pageInfo, status, error, onRetry, onPageChange, onSizeChange, onChanged }) {
  const dialog = useActionDialog()
  const api = API[kind]

  return (
    <>
      <AsyncContent
        status={status}
        error={error}
        onRetry={onRetry}
        isEmpty={items.length === 0}
        empty={<EmptyState icon={MessageSquare} title="No reviews" description="Nothing to moderate here." />}
      >
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {items.map((r) => (
            <ReviewRow key={r.publicId} review={r} onHide={(x) => dialog.open('hide', x)} onUnhide={(x) => dialog.open('unhide', x)} />
          ))}
        </ul>
        <Pagination {...pageInfo} sizeOptions={ADMIN_PAGE_SIZE_OPTIONS} onPageChange={onPageChange} onSizeChange={onSizeChange} />
      </AsyncContent>
      <ConfirmDialog
        open={dialog.action !== null}
        title={dialog.action === 'hide' ? 'Hide this review?' : 'Show this review again?'}
        message={
          dialog.action === 'hide'
            ? 'Customers will no longer see it. The store still sees it, with your reason.'
            : 'Customers will see it again.'
        }
        confirmLabel={dialog.action === 'hide' ? 'Hide review' : 'Unhide review'}
        tone={dialog.action === 'hide' ? 'danger' : 'primary'}
        requireReason
        error={dialog.error}
        onConfirm={dialog.run(
          (reason) => api[dialog.action](dialog.target.publicId, reason),
          dialog.action === 'hide' ? 'Review hidden.' : 'Review visible again.',
          onChanged,
        )}
        onCancel={dialog.close}
      />
    </>
  )
}
