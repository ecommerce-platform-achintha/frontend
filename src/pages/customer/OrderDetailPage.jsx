import { useCallback, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { PackageX } from 'lucide-react'
import {
  fetchCustomerOrder,
  selectCustomerOrder,
  selectCustomerOrderError,
  selectCustomerOrderStatus,
} from '@/store/slices/customerOrderSlice'
import { STATUS_LABELS } from '@/config/enums'
import { useWindowFocus } from '@/hooks/useWindowFocus'
import { formatDateTime } from '@/utils/format'
import AddressText from '@/components/address/AddressText'
import PageHeader from '@/components/common/PageHeader'
import { OrderAmounts, OrderItems, OrderPayments, OrderProgress, OrderTimeline } from '@/components/orders/OrderParts'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import CopyButton from '@/components/ui/CopyButton'
import EmptyState from '@/components/ui/EmptyState'
import ErrorState from '@/components/ui/ErrorState'
import Skeleton from '@/components/ui/Skeleton'
import StatusBadge from '@/components/ui/StatusBadge'
import NextStepPanel from './order/NextStepPanel'

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-1/2" />
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  )
}

export default function OrderDetailPage() {
  const { publicId } = useParams()
  const dispatch = useDispatch()
  const order = useSelector((s) => selectCustomerOrder(s, publicId))
  const status = useSelector((s) => selectCustomerOrderStatus(s, publicId))
  const error = useSelector((s) => selectCustomerOrderError(s, publicId))

  const load = useCallback(() => dispatch(fetchCustomerOrder(publicId)), [dispatch, publicId])
  useEffect(() => {
    load()
  }, [load])
  // No polling: refresh when the customer comes back to the tab.
  useWindowFocus(load)

  if (!order) {
    if (status === 'failed') {
      // Other customers' orders are also 404.
      return error?.status === 404 ? (
        <EmptyState icon={PackageX} title="Order not found" description="Check the order number." action={<Button to="/orders">My orders</Button>} />
      ) : (
        <ErrorState error={error} onRetry={load} />
      )
    }
    return <DetailSkeleton />
  }

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: 'My orders', to: '/orders' }, { label: order.publicId }]}
        title={
          <span className="flex flex-wrap items-center gap-3">
            {order.publicId}
            <StatusBadge value={order.status} type="OrderStatus" className="text-sm" />
          </span>
        }
        description={
          <>
            <Link to={`/stores/${order.storePublicId}`} className="font-medium text-primary-700 hover:underline dark:text-primary-300">
              {order.storeName}
            </Link>{' '}
            · {STATUS_LABELS[order.paymentMethod] ?? order.paymentMethod} · Placed {formatDateTime(order.timeline?.placedAt)}
          </>
        }
      />

      <div className="space-y-6">
        <Card className="p-5 sm:p-6">
          <OrderProgress order={order} />
        </Card>

        <NextStepPanel order={order} />

        <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
          <div className="space-y-6">
            <Card>
              <Card.Header title="Items" />
              <Card.Body className="pt-2">
                <OrderItems items={order.items} />
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
            <Card>
              <Card.Header title="Delivery" />
              <Card.Body className="space-y-3">
                <AddressText address={order.shippingAddress} />
                {order.contact && (
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Contact: {[order.contact.name, order.contact.phone, order.contact.email].filter(Boolean).join(' · ')}
                  </p>
                )}
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
