import { useParams } from 'react-router-dom'
import { PackageX } from 'lucide-react'
import { STATUS_LABELS } from '@/config/enums'
import { MERCHANT_STATUS_LABELS, MERCHANT_TERMINAL_TEXT } from '@/config/merchant'
import { useToast } from '@/hooks/useToast'
import { formatDateTime } from '@/utils/format'
import AddressText from '@/components/address/AddressText'
import PageHeader from '@/components/common/PageHeader'
import { LateFlags, OrderAmounts, OrderItems, OrderPayments, OrderProgress, OrderShipment, OrderTimeline } from '@/components/orders/OrderParts'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import CopyButton from '@/components/ui/CopyButton'
import EmptyState from '@/components/ui/EmptyState'
import ErrorState from '@/components/ui/ErrorState'
import Skeleton from '@/components/ui/Skeleton'
import StatusBadge from '@/components/ui/StatusBadge'
import CustomerInsight from './order/CustomerInsight'
import OrderActions from './order/OrderActions'
import { useMerchantOrder } from './order/useMerchantOrder'

export default function MerchantOrderDetailPage() {
  const { publicId } = useParams()
  const toast = useToast()
  const { order, error, status, reload, act } = useMerchantOrder(publicId)

  if (!order) {
    if (status === 'failed') {
      return error?.status === 404 ? (
        <EmptyState icon={PackageX} title="Order not found" description="Check the order number." action={<Button to="/merchant/orders">All orders</Button>} />
      ) : (
        <ErrorState error={error} onRetry={reload} />
      )
    }
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: 'Orders', to: '/merchant/orders' }, { label: order.publicId }]}
        title={
          <span className="flex flex-wrap items-center gap-3">
            {order.publicId}
            <StatusBadge value={order.status} type="OrderStatus" label={MERCHANT_STATUS_LABELS[order.status]} className="text-sm" />
          </span>
        }
        description={
          <span className="flex flex-wrap items-center gap-2">
            {STATUS_LABELS[order.paymentMethod] ?? order.paymentMethod} · Placed {formatDateTime(order.timeline?.placedAt)}
            {order.quoteRevision > 0 && <span>· Quote revision {order.quoteRevision}</span>}
            <LateFlags flags={order.flags} />
          </span>
        }
      />

      <div className="space-y-6">
        <Card className="p-5 sm:p-6">
          <OrderProgress order={order} terminalText={MERCHANT_TERMINAL_TEXT} />
        </Card>

        <OrderActions order={order} act={act} onDone={(message) => toast.success(message)} />

        <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
          <div className="space-y-6">
            <Card>
              <Card.Header title="Items" />
              <Card.Body className="pt-2">
                <OrderItems items={order.items} orderedLabel="Ordered" />
              </Card.Body>
            </Card>
            <Card>
              <Card.Header title="Payments" description="Account numbers are masked. Match the reference against your bank statement." />
              <Card.Body>
                <OrderPayments payments={order.payments} />
              </Card.Body>
            </Card>
            <Card>
              <Card.Header title="Timeline" />
              <Card.Body>
                <OrderTimeline timeline={order.timeline} />
              </Card.Body>
            </Card>
          </div>
          <div className="space-y-6">
            <Card>
              <Card.Header title="Amounts" />
              <Card.Body>
                <OrderAmounts amounts={order.amounts} />
              </Card.Body>
            </Card>
            <CustomerInsight order={order} />
            <Card>
              <Card.Header title="Deliver to" />
              <Card.Body className="space-y-3">
                <AddressText address={order.shippingAddress} />
                {order.contact && (
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Contact: {[order.contact.name, order.contact.phone, order.contact.email].filter(Boolean).join(' · ')}
                  </p>
                )}
              </Card.Body>
            </Card>
            <Card>
              <Card.Header title="Shipment" />
              <Card.Body>
                <OrderShipment shipment={order.shipment} />
              </Card.Body>
            </Card>
            <Card className="flex items-center justify-between gap-2 p-4 text-sm">
              <span className="text-slate-500 dark:text-slate-400">Order number</span>
              <span className="flex items-center font-mono">
                {order.publicId}
                <CopyButton value={order.publicId} label="Copy order number" />
              </span>
            </Card>
          </div>
        </div>
      </div>
    </>
  )
}
