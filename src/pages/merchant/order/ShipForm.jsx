import { useId, useState } from 'react'
import * as ordersApi from '@/api/orders'
import { errorMessage } from '@/config/errorMessages'
import { TRACKING_NUMBER_REGEX } from '@/config/merchant'
import { useMyCouriers } from '@/hooks/useMyCouriers'
import { REGEX } from '@/utils/validators'
import { splitApiError } from '@/utils/formErrors'
import FormAlert from '@/components/common/FormAlert'
import CourierField from '@/components/merchant/CourierField'
import Button from '@/components/ui/Button'
import FormField from '@/components/ui/FormField'
import Input from '@/components/ui/Input'
import Modal from '@/components/ui/Modal'
import Skeleton from '@/components/ui/Skeleton'

/**
 * Checks a tracking number against the courier's `trackingNumberRegex` (owner only: assistants
 * cannot read the courier list). The pattern is anchored so it must match the whole value.
 * A pattern the browser cannot compile is skipped; the server still checks (INVALID_TRACKING_NUMBER).
 */
function matchesCourierFormat(pattern, value) {
  if (!pattern) return true
  try {
    return new RegExp(`^(?:${pattern})$`).test(value)
  } catch {
    return true
  }
}

export default function ShipForm({ open, order, onClose, act, onDone }) {
  const formId = useId()
  const { couriers, loading } = useMyCouriers()
  const [courierCode, setCourierCode] = useState(order.amounts?.courierCode ?? '')
  const [trackingNumber, setTrackingNumber] = useState('')
  const [errors, setErrors] = useState({})
  const [formMessage, setFormMessage] = useState('')
  const [busy, setBusy] = useState(false)

  const courier = couriers?.find((c) => c.code === courierCode)

  const validate = () => {
    const next = {}
    if (!courierCode) next.courierCode = 'Choose a courier.'
    else if (!REGEX.code.test(courierCode)) next.courierCode = 'Use capital letters, digits or _ (2 to 20 characters).'
    const tn = trackingNumber.trim()
    if (!tn) next.trackingNumber = 'Enter the tracking number.'
    else if (!TRACKING_NUMBER_REGEX.test(tn)) next.trackingNumber = 'Use letters, digits and dashes only (up to 64).'
    else if (!matchesCourierFormat(courier?.trackingNumberRegex, tn))
      next.trackingNumber = `This does not look like a ${courier?.name ?? courierCode} tracking number. Check it and try again.`
    return next
  }

  const submit = async (event) => {
    event.preventDefault()
    const problems = validate()
    setErrors(problems)
    setFormMessage('')
    if (Object.keys(problems).length) return
    setBusy(true)
    try {
      await act(() => ordersApi.shipOrder(order.publicId, { courierCode, trackingNumber: trackingNumber.trim() }))
      onDone('Order marked as shipped. The customer can now track it.')
    } catch (err) {
      const { fieldErrors } = splitApiError(err)
      if (err?.code === 'INVALID_TRACKING_NUMBER') fieldErrors.trackingNumber = errorMessage(err)
      else if (err?.code === 'COURIER_NOT_AVAILABLE' || err?.code === 'COURIER_NOT_ENABLED') fieldErrors.courierCode = errorMessage(err)
      else setFormMessage(errorMessage(err))
      setErrors(fieldErrors)
      if (err?.code === 'INVALID_ORDER_STATE') onClose()
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      dismissible={!busy}
      title="Ship this order"
      description="Hand the parcel to the courier first, then enter its tracking number."
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" form={formId} loading={busy}>
            Mark as shipped
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={submit} noValidate className="space-y-4">
        {formMessage && <FormAlert>{formMessage}</FormAlert>}
        {loading ? (
          <Skeleton className="h-16" />
        ) : (
          <CourierField couriers={couriers} codOnly={order.paymentMethod === 'COD'} value={courierCode} onChange={setCourierCode} error={errors.courierCode} />
        )}
        <FormField label="Tracking number" required error={errors.trackingNumber}>
          <Input value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} maxLength={64} autoComplete="off" spellCheck={false} />
        </FormField>
      </form>
    </Modal>
  )
}
