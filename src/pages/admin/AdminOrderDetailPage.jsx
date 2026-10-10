import { Link, useParams } from 'react-router-dom'
import { Gavel, PackageX } from 'lucide-react'
import * as adminApi from '@/api/admin'
import { ADMIN_STATUS_LABELS, RESOLVE_OPTIONS } from '@/config/admin'
import { STATUS_LABELS } from '@/config/enums'
import { isOpenOrder } from '@/config/orders'
import { ORDER_CHANGED_CODES } from '@/store/slices/customerOrderSlice'
import { useActionDialog } from '@/hooks/useActionDialog'
import { useAsync } from '@/hooks/useAsync'
import { formatDateTime } from '@/utils/format'
import CustomerScoreCard from '@/components/admin/CustomerScoreCard'
import DecisionDialog from '@/components/admin/DecisionDialog'
import AddressText from '@/components/address/AddressText'
import PageHeader from '@/components/common/PageHeader'
import { LateFlags, OrderAmounts, OrderItems, OrderPayments, OrderProgress, OrderShipment, OrderTimeline } from '@/components/orders/OrderParts'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import EmptyState from '@/components/ui/EmptyState'
import ErrorState from '@/components/ui/ErrorState'
import Skeleton from '@/components/ui/Skeleton'
import StatusBadge from '@/components/ui/StatusBadge'

// Neutral wording for the closed-order banner on the admin side.
const ADMIN_TERMINAL_TEXT = {
  COMPLETED: 'This order is complete.',
  CANCELLED_BY_CUSTOMER: 'The customer cancelled before the quote.',
  REJECTED_BY_MERCHANT: 'The store rejected the order.',
  EXPIRED_MERCHANT: 'The store did not answer in time.',
  DECLINED_BY_CUSTOMER: 'The customer declined the quote.',
  EXPIRED_CUSTOMER: 'The customer did not confirm the quote in time.',
  EXPIRED_PAYMENT: 'The customer did not pay in time.',
  DELIVERY_FAILED: 'The delivery could not be completed.',
  CANCELLED_BY_SYSTEM: 'Cancelled automatically.',
  CLOSED_BY_ADMIN: 'Closed by the marketplace team.',
}

export default function AdminOrderDetailPage() {
  const { publicId } = useParams()
  const dialog = useActionDialog()
  const { data: order, status, error, reload, setData } = useAsync(() => adminApi.getOrder(publicId), publicId)

  if (status === 'failed') {
    return error?.status === 404 ? (
      <EmptyState icon={PackageX} title="Order not found" action={<Button to="/admin/orders">All orders</Button>} />
    ) : (
      <ErrorState error={error} onRetry={reload} />
    )
  }
  if (!order) return <Skeleton className="h-96 w-full" />

  // The response shape is not specified: use it when it is the order, otherwise read it again.
  const applied = (result) => (result?.publicId === publicId && result.status ? setData(result) : reload())

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: 'Orders', to: '/admin/orders' }, { label: order.publicId }]}
        title={
          <span className="flex flex-wrap items-center gap-3">
            {order.publicId}
            <StatusBadge value={order.status} type="OrderStatus" label={ADMIN_STATUS_LABELS[order.status]} className="text-sm" />
          </span>
        }
        description={
          <span className="flex flex-wrap items-center gap-2">
            <Link to={`/admin/stores/${order.storePublicId}`} className="font-medium text-primary-700 hover:underline dark:text-primary-300">
              {order.storeName}
            </Link>
            · {STATUS_LABELS[order.paymentMethod] ?? order.paymentMethod} · Placed {formatDateTime(order.timeline?.placedAt)}
            {order.flags?.needsAdminResolution && <Badge tone="danger">Needs resolution</Badge>}
            <LateFlags flags={order.flags} />
          </span>
        }
        actions={
          isOpenOrder(order.status) && (
            <Button leftIcon={Gavel} onClick={() => dialog.open('resolve')}>
              Resolve
            </Button>
          )
        }
      />
      <div className="space-y-6">
        <Card className="p-5 sm:p-6">
          <OrderProgress order={order} terminalText={ADMIN_TERMINAL_TEXT} />
        </Card>
        <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
          <div className="space-y-6">
            <Card>
              <Card.Header title="Items" />
              <Card.Body className="pt-2">
                <OrderItems items={order.items} orderedLabel="Ordered" />
              </Card.Body>
            </Card>
            <Card>
              <Card.Header title="Payments" />
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
            {order.customerPublicId && <CustomerScoreCard customerPublicId={order.customerPublicId} showUserLink />}
            <Card>
              <Card.Header title="Delivery" />
              <Card.Body className="space-y-3">
                <AddressText address={order.shippingAddress} />
                <OrderShipment shipment={order.shipment} />
              </Card.Body>
            </Card>
          </div>
        </div>
      </div>

      {dialog.isOpen('resolve') && (
        <DecisionDialog
          title="Resolve this order"
          description="Ends the order now. Use it for orders that cannot finish normally, for example when the merchant is banned."
          options={RESOLVE_OPTIONS}
          noteLabel="Reason"
          confirmLabel="Resolve order"
          error={dialog.error}
          onCancel={dialog.close}
          onConfirm={dialog.run(
            (action, reason) => adminApi.resolveOrder(publicId, { action, reason }),
            'Order resolved.',
            applied,
            (err) => ORDER_CHANGED_CODES.includes(err?.code) && reload(),
          )}
        />
      )}
    </>
  )
}
