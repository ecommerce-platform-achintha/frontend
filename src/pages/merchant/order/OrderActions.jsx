import { useState } from 'react'
import { BadgeCheck, CircleX, PackageX, Send, Truck, XCircle } from 'lucide-react'
import * as ordersApi from '@/api/orders'
import { ORDER_STATUS as S } from '@/config/enums'
import { errorMessage } from '@/config/errorMessages'
import { DEADLINE_LABELS, MERCHANT_CAN, MERCHANT_DEADLINE_TYPES } from '@/config/merchant'
import { ACTION_ACCESS } from '@/config/permissions'
import { useMerchantStatus } from '@/hooks/useMerchantStatus'
import { usePermissions } from '@/hooks/usePermissions'
import { formatDateTime } from '@/utils/format'
import PermissionButton from '@/components/common/PermissionButton'
import Card from '@/components/ui/Card'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import Countdown from '@/components/ui/Countdown'
import QuoteForm from './QuoteForm'
import { DeliveryFailedModal, RejectOrderModal } from './ReasonModals'
import ShipForm from './ShipForm'

// What the store should do next, per open status.
const NEXT_STEP = {
  [S.AWAITING_MERCHANT]: 'Check stock, then send a quote with the delivery charge, or reject the order.',
  [S.AWAITING_CUSTOMER_CONFIRMATION]: 'Waiting for the customer to confirm your quote. You can still change it.',
  [S.AWAITING_PAYMENT]: 'Waiting for the customer’s bank transfer.',
  [S.PAYMENT_SUBMITTED]: 'The customer says they paid. Check your bank account for the reference below, then verify or reject the payment.',
  [S.READY_TO_SHIP]: 'Pack the order and ship it before the deadline.',
  [S.SHIPPED]: 'On its way. The order completes when the customer confirms delivery, or automatically.',
}

export default function OrderActions({ order, act, onDone }) {
  const { hasPerm } = usePermissions()
  const { readOnly } = useMerchantStatus()
  const [open, setOpen] = useState(null) // quote | reject | verify | rejectPayment | ship | failed
  const [dialogError, setDialogError] = useState('')
  const close = () => {
    setOpen(null)
    setDialogError('')
  }
  const done = (message) => {
    close()
    onDone(message)
  }

  // Confirm dialogs keep themselves open when onConfirm throws.
  const confirmed = (call, message) => async (reason) => {
    setDialogError('')
    try {
      await act(() => call(reason))
      done(message)
    } catch (err) {
      setDialogError(errorMessage(err))
      if (err?.code === 'INVALID_ORDER_STATE') close()
      throw err
    }
  }

  const step = NEXT_STEP[order.status]
  if (!step) return null

  const can = (rule) => !readOnly && rule(order)
  const anyAction =
    !readOnly &&
    ((can(MERCHANT_CAN.quote) && hasPerm('ORDER_QUOTE')) ||
      (can(MERCHANT_CAN.verifyPayment) && hasPerm('PAYMENT_VERIFY')) ||
      ((can(MERCHANT_CAN.ship) || can(MERCHANT_CAN.deliveryFailed)) && hasPerm('ORDER_SHIP')))
  const showDeadline = MERCHANT_DEADLINE_TYPES.includes(order.deadlineType) && order.deadlineAt

  return (
    <Card className="border-primary-200 p-5 sm:p-6 dark:border-primary-500/30">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-semibold text-slate-900 dark:text-white">Next step</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{step}</p>
          {!anyAction && !readOnly && order.status !== S.AWAITING_PAYMENT && (
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Your permissions do not include this step.</p>
          )}
        </div>
        {showDeadline && (
          <div className="text-right text-sm">
            <p className="text-slate-500 dark:text-slate-400">{DEADLINE_LABELS[order.deadlineType]}</p>
            <p className="font-medium">{formatDateTime(order.deadlineAt)}</p>
            <Countdown deadlineAt={order.deadlineAt} overdueTone="danger" expiredLabel="Deadline passed" />
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {can(MERCHANT_CAN.quote) && (
          <PermissionButton perms={ACTION_ACCESS.quoteOrder} leftIcon={Send} onClick={() => setOpen('quote')}>
            {order.status === S.AWAITING_MERCHANT ? 'Send quote' : 'Change quote'}
          </PermissionButton>
        )}
        {can(MERCHANT_CAN.reject) && (
          <PermissionButton perms={ACTION_ACCESS.rejectOrder} variant="outline" leftIcon={XCircle} onClick={() => setOpen('reject')}>
            Reject order
          </PermissionButton>
        )}
        {can(MERCHANT_CAN.verifyPayment) && (
          <>
            <PermissionButton perms={ACTION_ACCESS.verifyPayment} variant="success" leftIcon={BadgeCheck} onClick={() => setOpen('verify')}>
              Verify payment
            </PermissionButton>
            <PermissionButton perms={ACTION_ACCESS.verifyPayment} variant="outline" leftIcon={CircleX} onClick={() => setOpen('rejectPayment')}>
              Reject payment
            </PermissionButton>
          </>
        )}
        {can(MERCHANT_CAN.ship) && (
          <PermissionButton perms={ACTION_ACCESS.shipOrder} leftIcon={Truck} onClick={() => setOpen('ship')}>
            Ship order
          </PermissionButton>
        )}
        {can(MERCHANT_CAN.deliveryFailed) && (
          <PermissionButton perms={ACTION_ACCESS.markDeliveryFailed} variant="outline" leftIcon={PackageX} onClick={() => setOpen('failed')}>
            Delivery failed
          </PermissionButton>
        )}
      </div>

      {/* Forms are mounted only while open, so each opening starts from the latest order. */}
      {open === 'quote' && <QuoteForm open order={order} onClose={close} act={act} onDone={done} />}
      {open === 'ship' && <ShipForm open order={order} onClose={close} act={act} onDone={done} />}
      {open === 'reject' && <RejectOrderModal open order={order} onClose={close} act={act} onDone={done} />}
      {open === 'failed' && <DeliveryFailedModal open order={order} onClose={close} act={act} onDone={done} />}

      <ConfirmDialog
        open={open === 'verify'}
        title="Verify this payment?"
        message={
          <>
            <p className="font-medium">Only verify after the money reached the account.</p>
            <p className="mt-2">Check your bank statement for the reference in the payments section. Verifying moves the order to “ready to ship”.</p>
          </>
        }
        confirmLabel="Yes, the money arrived"
        error={dialogError}
        onConfirm={confirmed(() => ordersApi.verifyPayment(order.publicId), 'Payment verified. The order is ready to ship.')}
        onCancel={close}
      />
      <ConfirmDialog
        open={open === 'rejectPayment'}
        title="Reject this payment?"
        message="The customer is told why and can send the payment again before the original deadline."
        confirmLabel="Reject payment"
        tone="danger"
        requireReason
        reasonLabel="Reason for the customer"
        error={dialogError}
        onConfirm={confirmed((reason) => ordersApi.rejectPayment(order.publicId, reason), 'Payment rejected. The customer can try again.')}
        onCancel={close}
      />
    </Card>
  )
}
