import { useState } from 'react'
import { UserX } from 'lucide-react'
import * as ordersApi from '@/api/orders'
import { errorMessage } from '@/config/errorMessages'
import { ACTION_ACCESS } from '@/config/permissions'
import { useToast } from '@/hooks/useToast'
import PermissionButton from '@/components/common/PermissionButton'
import Badge from '@/components/ui/Badge'
import Card from '@/components/ui/Card'
import ConfirmDialog from '@/components/ui/ConfirmDialog'

// The customer's track record (order.customer, store and admin views only) and "Block this customer".
export default function CustomerInsight({ order }) {
  const toast = useToast()
  const [blocking, setBlocking] = useState(false)
  const [error, setError] = useState('')
  const customer = order.customer

  const block = async (reason) => {
    setError('')
    try {
      await ordersApi.blockCustomer({ customerPublicId: order.customerPublicId, reason })
      setBlocking(false)
      toast.success('Customer blocked. They cannot place new orders with your store.', undefined, {
        action: { label: 'Blocked customers', to: '/merchant/customer-blocks' },
      })
    } catch (err) {
      setError(errorMessage(err))
      throw err
    }
  }

  return (
    <Card>
      <Card.Header title="Customer" />
      <Card.Body className="space-y-3 text-sm">
        {customer ? (
          <>
            <dl className="grid grid-cols-2 gap-3">
              <div>
                <dt className="text-xs text-slate-500 dark:text-slate-400">Score</dt>
                <dd className="text-lg font-semibold tabular-nums">{customer.score ?? 'n/a'}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500 dark:text-slate-400">COD refusals</dt>
                <dd className="text-lg font-semibold tabular-nums">{customer.codRefusals ?? 0}</dd>
              </div>
            </dl>
            {customer.codSuspended && <Badge tone="danger">Cash on delivery suspended</Badge>}
            <p className="text-xs text-slate-500 dark:text-slate-400">
              The score rises with completed orders and drops when the customer declines quotes, lets them expire or refuses cash on
              delivery. Use it as a hint, not a verdict.
            </p>
          </>
        ) : (
          <p className="text-slate-500 dark:text-slate-400">No customer history available.</p>
        )}
        {order.customerPublicId && (
          <PermissionButton perms={ACTION_ACCESS.blockCustomer} variant="outline" size="sm" leftIcon={UserX} onClick={() => setBlocking(true)}>
            Block this customer
          </PermissionButton>
        )}
      </Card.Body>
      <ConfirmDialog
        open={blocking}
        title="Block this customer?"
        message="They will not be able to place new orders with your store. You can unblock them later."
        confirmLabel="Block customer"
        tone="danger"
        requireReason
        error={error}
        onConfirm={block}
        onCancel={() => {
          setBlocking(false)
          setError('')
        }}
      />
    </Card>
  )
}
