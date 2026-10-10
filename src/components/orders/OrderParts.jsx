// Read-only order sections shared by the customer, merchant and admin order pages.
// Every number comes straight from the order response (contract section 8); nothing is recomputed.
import { CircleCheck, CircleX, ExternalLink, Info } from 'lucide-react'
import { orderProgress, TERMINAL_STATUS_TEXT, TIMELINE_STEPS, isOpenOrder } from '@/config/orders'
import { STATUS_LABELS } from '@/config/enums'
import { formatDateTime, formatMoney, humanizeEnum } from '@/utils/format'
import { cn } from '@/utils/cn'
import SmartImage from '@/components/common/SmartImage'
import Badge from '@/components/ui/Badge'
import StatusBadge from '@/components/ui/StatusBadge'
import Stepper from '@/components/ui/Stepper'

const attributesText = (attributes) =>
  attributes && typeof attributes === 'object'
    ? Object.entries(attributes)
        .map(([k, v]) => `${k}: ${v}`)
        .join(' · ')
    : ''

// Stepper for open orders; a clear banner (with the reason) for terminal ones.
// `terminalText` words the banner for the reader (customer texts by default).
export function OrderProgress({ order, terminalText = TERMINAL_STATUS_TEXT }) {
  if (isOpenOrder(order.status)) {
    const { steps, currentIndex, failed } = orderProgress(order.status, order.paymentMethod)
    return <Stepper steps={steps} currentIndex={currentIndex} failed={failed} />
  }
  const completed = order.status === 'COMPLETED'
  const Icon = completed ? CircleCheck : CircleX
  return (
    <div
      role="status"
      className={cn(
        'flex items-start gap-3 rounded-xl p-4 text-sm',
        completed
          ? 'bg-success-50 text-success-900 dark:bg-success-500/10 dark:text-success-200'
          : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200',
      )}
    >
      <Icon aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
      <div>
        <p className="font-semibold">{STATUS_LABELS[order.status] ?? humanizeEnum(order.status)}</p>
        <p>{terminalText[order.status] ?? 'This order is closed.'}</p>
        {order.reasonCode && <p className="mt-1">Reason: {humanizeEnum(order.reasonCode)}</p>}
        {order.reason && <p className="mt-1 whitespace-pre-line">“{order.reason}”</p>}
        {order.deliveryFailureType && <p className="mt-1">Delivery problem: {STATUS_LABELS[order.deliveryFailureType] ?? humanizeEnum(order.deliveryFailureType)}</p>}
      </div>
    </div>
  )
}

// Items. `orderedQuantity` is what the customer asked for; `quantity` is what the quote kept.
// `orderedLabel` words the note for the reader ("You asked for" for customers, "Ordered" for stores).
export function OrderItems({ items = [], orderedLabel = 'You asked for' }) {
  return (
    <ul className="divide-y divide-slate-100 dark:divide-slate-800">
      {items.map((item) => {
        const reduced = item.orderedQuantity != null && item.orderedQuantity !== item.quantity
        return (
          <li key={item.variantPublicId} className="flex gap-3 py-3 text-sm">
            <SmartImage src={null} alt="" name={item.name} className="size-12 shrink-0 rounded-lg" />
            <div className="min-w-0 flex-1">
              <p className="font-medium text-slate-900 dark:text-white">{item.name}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {[item.variantName || attributesText(item.attributes), item.sku && `SKU ${item.sku}`].filter(Boolean).join(' · ')}
              </p>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                {formatMoney(item.unitPrice)} × {item.quantity}
                {reduced && (
                  <span className="ml-2 rounded bg-warning-50 px-1.5 py-0.5 font-medium text-warning-800 dark:bg-warning-500/15 dark:text-warning-300">
                    {orderedLabel} {item.orderedQuantity}
                  </span>
                )}
                {Number(item.discountAmount) > 0 && <span className="ml-2 text-slate-400 line-through">{formatMoney(item.listPrice)}</span>}
              </p>
            </div>
            <span className={cn('font-medium tabular-nums', item.quantity === 0 && 'text-slate-400 line-through')}>{formatMoney(item.lineTotal)}</span>
          </li>
        )
      })}
    </ul>
  )
}

function Row({ label, value, strong, muted }) {
  return (
    <div className={cn('flex justify-between gap-4', strong && 'border-t border-slate-100 pt-2 text-base font-semibold dark:border-slate-800')}>
      <dt className={muted ? 'text-slate-500 dark:text-slate-400' : undefined}>{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  )
}

// Amounts breakdown. Before the quote, courier and charges are not known yet.
export function OrderAmounts({ amounts }) {
  if (!amounts) return null
  const quoted = amounts.courierCharge != null || amounts.courierCode
  return (
    <dl className="space-y-2 text-sm">
      <Row label="Items" value={formatMoney(amounts.itemsTotal)} muted />
      {quoted ? (
        <Row label={`Delivery${amounts.courierCode ? ` (${amounts.courierCode})` : ''}`} value={formatMoney(amounts.courierCharge)} muted />
      ) : (
        <Row label="Delivery" value="Quoted by the store" muted />
      )}
      {(amounts.otherCharges ?? []).map((charge, i) => (
        <Row key={`${charge.label}-${i}`} label={charge.label} value={formatMoney(charge.amount)} muted />
      ))}
      {Number(amounts.quoteDiscount) > 0 && <Row label="Store discount" value={`− ${formatMoney(amounts.quoteDiscount)}`} muted />}
      <Row label="Total" value={formatMoney(amounts.grandTotal)} strong />
    </dl>
  )
}

export function OrderTimeline({ timeline }) {
  const entries = TIMELINE_STEPS.filter(([key]) => timeline?.[key])
  if (!entries.length) return <p className="text-sm text-slate-500">No events yet.</p>
  return (
    <ol className="relative space-y-4 border-l border-slate-200 pl-5 dark:border-slate-700">
      {entries.map(([key, label]) => (
        <li key={key} className="relative text-sm">
          <span aria-hidden="true" className="absolute top-1.5 -left-[25px] size-2.5 rounded-full bg-primary-500 ring-4 ring-white dark:ring-slate-900" />
          <p className="font-medium text-slate-900 dark:text-white">{label}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">{formatDateTime(timeline[key])}</p>
        </li>
      ))}
    </ol>
  )
}

// Submitted payments. Account numbers are always masked here.
export function OrderPayments({ payments = [] }) {
  if (!payments.length) return <p className="text-sm text-slate-500">No payments yet.</p>
  return (
    <ul className="space-y-3">
      {payments.map((p) => (
        <li key={p.publicId} className="rounded-xl border border-slate-200 p-4 text-sm dark:border-slate-700">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-medium text-slate-900 dark:text-white">Reference {p.referenceNumber}</span>
            {/* Payment status values are not listed in the contract; shown as sent. */}
            <StatusBadge value={p.status} />
          </div>
          <dl className="mt-2 grid gap-x-4 gap-y-1 text-xs text-slate-600 sm:grid-cols-2 dark:text-slate-300">
            <div>
              From: {p.sourceBankCode} {p.sourceAccountMasked}
            </div>
            <div>To: {p.destinationBankCode}</div>
            <div>Submitted: {formatDateTime(p.submittedAt)}</div>
            {p.decidedAt && <div>Decided: {formatDateTime(p.decidedAt)}</div>}
          </dl>
          {p.rejectionReason && (
            <p className="mt-2 flex items-start gap-1.5 rounded-lg bg-danger-50 px-3 py-2 text-xs text-danger-800 dark:bg-danger-500/10 dark:text-danger-200">
              <Info aria-hidden="true" className="mt-px size-3.5 shrink-0" />
              Rejected by the store: {p.rejectionReason}
            </p>
          )}
          {p.attachmentUrls?.length > 0 && (
            <ul className="mt-2 flex gap-2">
              {p.attachmentUrls.map((url) => (
                <li key={url}>
                  <SmartImage src={url} alt="Payment receipt" className="size-12 rounded-lg" />
                </li>
              ))}
            </ul>
          )}
        </li>
      ))}
    </ul>
  )
}

// Only open tracking links that are https (the template comes from admin data, but be safe).
const safeTrackingUrl = (url) => (typeof url === 'string' && url.startsWith('https://') ? url : null)

export function OrderShipment({ shipment }) {
  if (!shipment) return <p className="text-sm text-slate-500">Not shipped yet.</p>
  const url = safeTrackingUrl(shipment.trackingUrl)
  return (
    <div className="space-y-1 text-sm">
      <p className="font-medium text-slate-900 dark:text-white">{shipment.courierName ?? shipment.courierCode}</p>
      <p className="text-slate-600 dark:text-slate-300">
        Tracking number <span className="font-mono font-medium">{shipment.trackingNumber}</span>
      </p>
      {shipment.shippedAt && <p className="text-xs text-slate-500 dark:text-slate-400">Shipped {formatDateTime(shipment.shippedAt)}</p>}
      {url && (
        <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 font-semibold text-primary-700 hover:underline dark:text-primary-300">
          Track parcel <ExternalLink aria-hidden="true" className="size-4" />
        </a>
      )}
    </div>
  )
}

// Store-side deadline flags (set by the server when a deadline passed).
export function LateFlags({ flags }) {
  if (!flags?.lateShipment && !flags?.lateVerification) return null
  return (
    <span className="flex flex-wrap gap-1">
      {flags.lateShipment && <Badge tone="danger">Late shipment</Badge>}
      {flags.lateVerification && <Badge tone="danger">Late payment check</Badge>}
    </span>
  )
}
