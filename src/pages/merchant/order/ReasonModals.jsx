// Small order dialogs with a choice and a note: reject the order, report a failed delivery.
import { useId, useState } from 'react'
import * as ordersApi from '@/api/orders'
import { ENUMS } from '@/config/enums'
import { errorMessage } from '@/config/errorMessages'
import { DELIVERY_FAILURE_LABELS, REJECTION_REASON_LABELS } from '@/config/merchant'
import { LIMITS, validateReason } from '@/utils/validators'
import FormAlert from '@/components/common/FormAlert'
import Button from '@/components/ui/Button'
import FormField from '@/components/ui/FormField'
import Modal from '@/components/ui/Modal'
import Select from '@/components/ui/Select'
import Textarea from '@/components/ui/Textarea'

function ChoiceWithNote({ open, onClose, title, description, choiceLabel, options, notice, confirmLabel, tone = 'danger', onSubmit }) {
  const formId = useId()
  const [choice, setChoice] = useState('')
  const [note, setNote] = useState('')
  const [errors, setErrors] = useState({})
  const [formMessage, setFormMessage] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (event) => {
    event.preventDefault()
    const next = {}
    if (!choice) next.choice = 'Choose one.'
    const noteProblem = validateReason(note, { required: false })
    if (noteProblem) next.note = noteProblem
    setErrors(next)
    setFormMessage('')
    if (Object.keys(next).length) return
    setBusy(true)
    try {
      await onSubmit(choice, note.trim() || undefined)
    } catch (err) {
      setFormMessage(errorMessage(err))
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
      title={title}
      description={description}
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" form={formId} variant={tone} loading={busy}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={submit} noValidate className="space-y-4">
        {formMessage && <FormAlert>{formMessage}</FormAlert>}
        {notice && <FormAlert tone="info">{notice}</FormAlert>}
        <FormField label={choiceLabel} required error={errors.choice}>
          <Select value={choice} onChange={(e) => setChoice(e.target.value)} options={options} placeholder="Choose…" />
        </FormField>
        <FormField label="Note" hint="Optional. Up to 500 characters." error={errors.note}>
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={LIMITS.reason} rows={3} />
        </FormField>
      </form>
    </Modal>
  )
}

export function RejectOrderModal({ open, order, onClose, act, onDone }) {
  return (
    <ChoiceWithNote
      open={open}
      onClose={onClose}
      title="Reject this order"
      description="The customer is told the store cannot take the order."
      choiceLabel="Reason"
      options={ENUMS.RejectionReason.map((v) => ({ value: v, label: REJECTION_REASON_LABELS[v] ?? v }))}
      notice="Rejecting a new order carries no penalty for your store."
      confirmLabel="Reject order"
      onSubmit={async (reasonCode, note) => {
        await act(() => ordersApi.rejectOrder(order.publicId, { reasonCode, note }))
        onDone('Order rejected.')
      }}
    />
  )
}

export function DeliveryFailedModal({ open, order, onClose, act, onDone }) {
  return (
    <ChoiceWithNote
      open={open}
      onClose={onClose}
      title="Report a failed delivery"
      description="Use this when the courier could not complete the delivery. The order closes."
      choiceLabel="What happened"
      options={ENUMS.DeliveryFailureType.map((v) => ({ value: v, label: DELIVERY_FAILURE_LABELS[v] ?? v }))}
      notice="A cash on delivery refusal counts against the customer’s record and can lead to a COD suspension. The customer may dispute it, and the marketplace then reviews the case. Only choose it when the customer really refused to pay."
      confirmLabel="Report failed delivery"
      onSubmit={async (type, note) => {
        await act(() => ordersApi.markDeliveryFailed(order.publicId, { type, note }))
        onDone('Failed delivery reported.')
      }}
    />
  )
}
