import { useState } from 'react'
import { useDispatch } from 'react-redux'
import { CircleCheck, ExternalLink, Hourglass, MessageSquareWarning, PackageCheck, Star, Truck } from 'lucide-react'
import { ORDER_CHANGED_CODES, runOrderAction } from '@/store/slices/customerOrderSlice'
import { CUSTOMER_CAN } from '@/config/orders'
import { errorMessage } from '@/config/errorMessages'
import { useToast } from '@/hooks/useToast'
import { OrderAmounts, OrderItems } from '@/components/orders/OrderParts'
import ShopperButton from '@/components/common/ShopperButton'
import ReviewModal from '@/components/reviews/ReviewModal'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import Countdown from '@/components/ui/Countdown'
import CodObjectionModal from './CodObjectionModal'
import PaymentPanel from './PaymentPanel'

// Only open tracking links that are https (the template comes from admin data, but be safe).
const safeTrackingUrl = (url) => (typeof url === 'string' && url.startsWith('https://') ? url : null)

function Panel({ icon: Icon, title, children, tone = 'primary' }) {
  const toneClass =
    tone === 'warning'
      ? 'bg-warning-50 text-warning-700 dark:bg-warning-500/15 dark:text-warning-300'
      : tone === 'success'
        ? 'bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-300'
        : 'bg-primary-50 text-primary-700 dark:bg-primary-500/15 dark:text-primary-200'
  return (
    <Card className="border-primary-200/70 p-5 sm:p-6 dark:border-primary-500/30">
      <div className="flex items-start gap-4">
        <span className={`flex size-11 shrink-0 items-center justify-center rounded-2xl ${toneClass}`}>
          <Icon aria-hidden="true" className="size-5" />
        </span>
        <div className="min-w-0 flex-1 space-y-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{title}</h2>
          {children}
        </div>
      </div>
    </Card>
  )
}

const complaintLink = (order) => `/complaints?order=${encodeURIComponent(order.publicId)}`

// Distinct products of the order, each with its variants (for product reviews).
function productsOf(order) {
  const map = new Map()
  for (const item of order.items ?? []) {
    if (item.quantity === 0) continue
    const entry = map.get(item.itemPublicId) ?? { productPublicId: item.itemPublicId, name: item.name, variants: [] }
    entry.variants.push({ variantPublicId: item.variantPublicId, label: item.variantName || item.sku || item.variantPublicId })
    map.set(item.itemPublicId, entry)
  }
  return [...map.values()]
}

/** The main call to action for the customer, chosen by order status (contract section 8). */
export default function NextStepPanel({ order }) {
  const dispatch = useDispatch()
  const toast = useToast()
  const [confirming, setConfirming] = useState(null) // 'cancel' | 'decline' | 'received'
  const [busy, setBusy] = useState(null)
  const [reviewTarget, setReviewTarget] = useState(null)
  const [reviewed, setReviewed] = useState([]) // targets reviewed in this visit
  const [objectionOpen, setObjectionOpen] = useState(false)

  const run = async (action, successText) => {
    setBusy(action)
    try {
      await dispatch(runOrderAction({ publicId: order.publicId, action })).unwrap()
      toast.success(successText)
      setConfirming(null)
    } catch (error) {
      if (ORDER_CHANGED_CODES.includes(error.code)) {
        toast.info(errorMessage(error))
        setConfirming(null)
        return
      }
      toast.error(errorMessage(error))
      throw error // keeps a ConfirmDialog open
    } finally {
      setBusy(null)
    }
  }

  const dialogs = {
    cancel: {
      title: 'Cancel this order?',
      message: 'The store has not answered yet, so cancelling is free.',
      confirmLabel: 'Cancel order',
      tone: 'danger',
      onConfirm: () => run('cancel', 'Your order was cancelled.'),
    },
    decline: {
      title: 'Decline the quote?',
      message: 'The order will be closed. Declining a quote lowers your customer score.',
      confirmLabel: 'Decline quote',
      tone: 'danger',
      onConfirm: () => run('decline', 'You declined the quote.'),
    },
    received: {
      title: 'Did your parcel arrive?',
      message: 'Confirm only when you have the parcel. The order will be completed.',
      confirmLabel: 'Yes, I received it',
      onConfirm: () => run('received', 'Thanks! Your order is complete.'),
    },
  }

  let content = null
  const status = order.status

  if (status === 'AWAITING_MERCHANT') {
    content = (
      <Panel icon={Hourglass} title="Waiting for the store" tone="warning">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          The store is checking availability and will send you a quote with the delivery cost.
        </p>
        <Countdown deadlineAt={order.deadlineAt} expiredLabel="The store’s time to reply has ended" />
        {CUSTOMER_CAN.cancel(order) && (
          <Button variant="outline" onClick={() => setConfirming('cancel')}>
            Cancel order
          </Button>
        )}
      </Panel>
    )
  } else if (status === 'AWAITING_CUSTOMER_CONFIRMATION') {
    content = (
      <Panel icon={CircleCheck} title="Your quote is ready" tone="warning">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Check what the store can send and the delivery cost.
          {order.quoteRevision > 0 && ` This is revision ${order.quoteRevision} of the quote.`}
        </p>
        <Countdown deadlineAt={order.deadlineAt} expiredLabel="The quote has expired" />
        <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
          <OrderItems items={order.items} />
          <div className="mt-3 border-t border-slate-100 pt-3 dark:border-slate-800">
            <OrderAmounts amounts={order.amounts} />
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <ShopperButton
            loading={busy === 'confirm'}
            onClick={() => run('confirm', order.paymentMethod === 'COD' ? 'Confirmed. The store will prepare your order.' : 'Confirmed. You can pay now.').catch(() => {})}
          >
            Confirm quote
          </ShopperButton>
          <Button variant="outline" onClick={() => setConfirming('decline')}>
            Decline
          </Button>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">Declining lowers your customer score.</p>
      </Panel>
    )
  } else if (status === 'AWAITING_PAYMENT') {
    const lastRejected = [...(order.payments ?? [])].reverse().find((p) => p.rejectionReason)
    content = (
      <Panel icon={CircleCheck} title="Pay by bank transfer" tone="warning">
        <Countdown deadlineAt={order.deadlineAt} expiredLabel="The time to pay has ended" />
        {lastRejected && (
          <p className="rounded-lg bg-danger-50 px-3 py-2 text-sm text-danger-800 dark:bg-danger-500/10 dark:text-danger-200">
            The store could not verify your last payment: {lastRejected.rejectionReason}. Please check and submit again.
          </p>
        )}
        {CUSTOMER_CAN.pay(order) && <PaymentPanel order={order} />}
      </Panel>
    )
  } else if (status === 'PAYMENT_SUBMITTED') {
    const last = order.payments?.at(-1)
    content = (
      <Panel icon={Hourglass} title="Waiting for the store to verify your payment">
        {last && (
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Reference <span className="font-medium">{last.referenceNumber}</span> from {last.sourceBankCode} {last.sourceAccountMasked}.
          </p>
        )}
        <p className="text-sm text-slate-500 dark:text-slate-400">We will update this page when the store confirms it.</p>
      </Panel>
    )
  } else if (status === 'READY_TO_SHIP') {
    content = (
      <Panel icon={PackageCheck} title="Being prepared">
        <p className="text-sm text-slate-600 dark:text-slate-300">The store is packing your order and will ship it soon.</p>
        <Button to={complaintLink(order)} variant="ghost" leftIcon={MessageSquareWarning}>
          Report a problem
        </Button>
      </Panel>
    )
  } else if (status === 'SHIPPED') {
    const url = safeTrackingUrl(order.shipment?.trackingUrl)
    content = (
      <Panel icon={Truck} title="On the way">
        {order.shipment && (
          <div className="rounded-xl border border-slate-200 p-4 text-sm dark:border-slate-700">
            <p className="font-medium text-slate-900 dark:text-white">{order.shipment.courierName ?? order.shipment.courierCode}</p>
            <p className="text-slate-600 dark:text-slate-300">
              Tracking number <span className="font-mono font-medium">{order.shipment.trackingNumber}</span>
            </p>
            {url && (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1.5 font-semibold text-primary-700 hover:underline dark:text-primary-300"
              >
                Track parcel <ExternalLink aria-hidden="true" className="size-4" />
              </a>
            )}
          </div>
        )}
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button onClick={() => setConfirming('received')}>I received my parcel</Button>
          <Button to={complaintLink(order)} variant="ghost" leftIcon={MessageSquareWarning}>
            Report a problem
          </Button>
        </div>
      </Panel>
    )
  } else if (status === 'COMPLETED') {
    const products = productsOf(order)
    const isDone = (key) => reviewed.includes(key)
    content = (
      <Panel icon={Star} title="How was it?" tone="success">
        <p className="text-sm text-slate-600 dark:text-slate-300">Your review helps other shoppers.</p>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            disabled={isDone(`store:${order.storePublicId}`)}
            onClick={() => setReviewTarget({ kind: 'store', storePublicId: order.storePublicId, name: order.storeName })}
          >
            {isDone(`store:${order.storePublicId}`) ? 'Store reviewed' : `Review ${order.storeName}`}
          </Button>
          {products.map((p) => (
            <Button
              key={p.productPublicId}
              variant="outline"
              disabled={isDone(`product:${p.productPublicId}`)}
              onClick={() => setReviewTarget({ kind: 'product', ...p })}
            >
              {isDone(`product:${p.productPublicId}`) ? `${p.name} reviewed` : `Review ${p.name}`}
            </Button>
          ))}
        </div>
        <Button to={complaintLink(order)} variant="ghost" size="sm" leftIcon={MessageSquareWarning}>
          Report a problem
        </Button>
      </Panel>
    )
  } else if (CUSTOMER_CAN.objectToCodRefusal(order)) {
    content = (
      <Panel icon={MessageSquareWarning} title="Delivery marked as refused" tone="warning">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          The store says the cash-on-delivery parcel was refused. If that is not right, you can dispute it.
        </p>
        <Button variant="outline" onClick={() => setObjectionOpen(true)}>
          Dispute this
        </Button>
      </Panel>
    )
  }

  const dialog = confirming ? dialogs[confirming] : null

  return (
    <>
      {content}
      <ConfirmDialog
        open={Boolean(dialog)}
        title={dialog?.title}
        message={dialog?.message}
        confirmLabel={dialog?.confirmLabel}
        tone={dialog?.tone}
        onConfirm={dialog?.onConfirm}
        onCancel={() => setConfirming(null)}
      />
      <ReviewModal
        open={Boolean(reviewTarget)}
        target={reviewTarget}
        orderPublicId={order.publicId}
        onClose={() => setReviewTarget(null)}
        onDone={(target, result) => {
          const key = target.kind === 'store' ? `store:${target.storePublicId}` : `product:${target.productPublicId}`
          setReviewed((list) => [...list, key])
          if (result === 'created') {
            toast.success('Thanks for your review!')
            setReviewTarget(null)
          }
        }}
      />
      <CodObjectionModal open={objectionOpen} orderPublicId={order.publicId} onClose={() => setObjectionOpen(false)} />
    </>
  )
}
