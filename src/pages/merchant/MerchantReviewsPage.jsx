import { useMemo, useState } from 'react'
import { EyeOff, MessageSquare, Store } from 'lucide-react'
import * as catalogApi from '@/api/catalog'
import * as storesApi from '@/api/stores'
import { merchantLists } from '@/store/slices/merchantLists'
import { REVIEW_SORT_OPTIONS } from '@/config/catalog'
import { errorMessage } from '@/config/errorMessages'
import { REPLY_TEXT_MAX } from '@/config/merchant'
import { useMerchantStatus } from '@/hooks/useMerchantStatus'
import { usePagedList } from '@/hooks/usePagedList'
import { useToast } from '@/hooks/useToast'
import { useUrlQuery } from '@/hooks/useUrlQuery'
import { formatDate } from '@/utils/format'
import AsyncContent from '@/components/common/AsyncContent'
import FormAlert from '@/components/common/FormAlert'
import PageHeader from '@/components/common/PageHeader'
import SmartImage from '@/components/common/SmartImage'
import ProductPicker from '@/components/merchant/ProductPicker'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import EmptyState from '@/components/ui/EmptyState'
import Pagination from '@/components/ui/Pagination'
import RatingStars from '@/components/ui/RatingStars'
import Select from '@/components/ui/Select'
import Tabs from '@/components/ui/Tabs'
import Textarea from '@/components/ui/Textarea'

const DEFAULTS = { tab: 'store', product: '', sort: 'createdAt,desc', page: 0, size: 20 }
const TABS = [
  { value: 'store', label: 'Store reviews' },
  { value: 'product', label: 'Product reviews' },
]

function ReplyForm({ onSubmit }) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (!open) {
    return (
      <Button variant="ghost" size="sm" leftIcon={MessageSquare} onClick={() => setOpen(true)} className="mt-2">
        Reply
      </Button>
    )
  }
  const submit = async (event) => {
    event.preventDefault()
    if (!text.trim()) return setError('Write a reply first.')
    setBusy(true)
    setError('')
    try {
      await onSubmit(text.trim())
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }
  return (
    <form onSubmit={submit} noValidate className="mt-3 space-y-2">
      {error && <FormAlert>{error}</FormAlert>}
      <Textarea value={text} onChange={(e) => setText(e.target.value)} maxLength={REPLY_TEXT_MAX} rows={3} aria-label="Your reply" autoFocus />
      <p className="text-xs text-slate-500 dark:text-slate-400">Replies are public and you can reply only once.</p>
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={() => setOpen(false)} disabled={busy}>
          Cancel
        </Button>
        <Button type="submit" size="sm" loading={busy}>
          Post reply
        </Button>
      </div>
    </form>
  )
}

/*
 * Hidden reviews: the contract says these lists include hidden reviews but does not name the fields.
 * We read `hidden` and `hiddenReason` (falling back to `hideReason`); if absent nothing is shown.
 */
function ReviewRow({ review, canReply, onReply }) {
  const hiddenReason = review.hiddenReason ?? review.hideReason
  return (
    <li className="py-5 first:pt-0">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <RatingStars value={review.rating} />
        {review.productName && <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{review.productName}</span>}
        {review.variantLabel && <span className="text-xs text-slate-500 dark:text-slate-400">{review.variantLabel}</span>}
        <span className="text-xs text-slate-400">{formatDate(review.createdAt)}</span>
      </div>
      {review.hidden && (
        <p className="mt-2 flex items-start gap-1.5 rounded-lg bg-warning-50 px-3 py-2 text-xs text-warning-900 dark:bg-warning-500/10 dark:text-warning-200">
          <EyeOff aria-hidden="true" className="mt-px size-3.5 shrink-0" />
          Hidden from customers by the marketplace team{hiddenReason ? `: ${hiddenReason}` : '.'}
        </p>
      )}
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
      {review.reply?.text ? (
        <div className="mt-3 rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-800/60">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
            <Store aria-hidden="true" className="size-3.5" />
            Your reply
            <span className="font-normal text-slate-400">· {formatDate(review.reply.createdAt)}</span>
          </p>
          <p className="mt-1 whitespace-pre-line text-slate-600 dark:text-slate-300">{review.reply.text}</p>
        </div>
      ) : (
        canReply && <ReplyForm onSubmit={(text) => onReply(review, text)} />
      )}
    </li>
  )
}

export default function MerchantReviewsPage() {
  const toast = useToast()
  const { readOnly } = useMerchantStatus()
  const [query, setQuery] = useUrlQuery(DEFAULTS)
  const tab = query.tab === 'product' ? 'product' : 'store'
  const sort = REVIEW_SORT_OPTIONS.some((o) => o.value === query.sort) ? query.sort : DEFAULTS.sort

  const storeParams = useMemo(() => (tab === 'store' ? { sort, page: query.page, size: query.size } : null), [tab, sort, query.page, query.size])
  const productParams = useMemo(
    () => (tab === 'product' ? { product: query.product || undefined, sort, page: query.page, size: query.size } : null),
    [tab, query.product, sort, query.page, query.size],
  )
  const storeList = usePagedList(merchantLists.storeReviews, storeParams)
  const productList = usePagedList(merchantLists.productReviews, productParams)
  const list = tab === 'store' ? storeList : productList

  const reply = async (review, text) => {
    try {
      if (tab === 'store') await storesApi.replyToStoreReview(review.publicId, text)
      else await catalogApi.replyToProductReview(review.publicId, text)
      toast.success('Reply posted.')
    } catch (err) {
      // Someone already replied: show their reply.
      if (err?.code === 'REPLY_ALREADY_EXISTS') list.reload()
      throw err
    }
    list.reload()
  }

  return (
    <>
      <PageHeader title="Reviews" description="What customers say about your store and products. Reply once to each review." />
      <Card className="p-4 sm:p-5">
        <Tabs tabs={TABS} value={tab} onChange={(value) => setQuery({ tab: value, product: '' })} />
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-start">
          {tab === 'product' && (
            <div className="flex-1">
              <ProductPicker value={query.product} onChange={(product) => setQuery({ product })} emptyLabel="All products" />
            </div>
          )}
          <Select aria-label="Sort reviews" value={sort} onChange={(e) => setQuery({ sort: e.target.value })} options={REVIEW_SORT_OPTIONS} className="sm:ml-auto sm:w-48" />
        </div>
        <div className="mt-4">
          <AsyncContent
            status={list.status}
            error={list.error}
            onRetry={list.reload}
            isEmpty={list.items.length === 0}
            empty={<EmptyState icon={MessageSquare} title="No reviews yet" description="Customers can review after their order is completed." />}
          >
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {list.items.map((review) => (
                <ReviewRow key={review.publicId} review={review} canReply={!readOnly} onReply={reply} />
              ))}
            </ul>
            <Pagination {...list.pageInfo} onPageChange={(page) => setQuery({ page }, { resetPage: false })} />
          </AsyncContent>
        </div>
      </Card>
    </>
  )
}
