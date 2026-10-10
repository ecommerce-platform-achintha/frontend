import { useId, useState } from 'react'
import { useDispatch } from 'react-redux'
import { submitCodObjection } from '@/store/slices/customerOrderSlice'
import { errorMessage } from '@/config/errorMessages'
import { useToast } from '@/hooks/useToast'
import { LIMITS } from '@/utils/validators'
import FormAlert from '@/components/common/FormAlert'
import Button from '@/components/ui/Button'
import FormField from '@/components/ui/FormField'
import Modal from '@/components/ui/Modal'
import Textarea from '@/components/ui/Textarea'

// "Dispute this" for a delivery marked as COD refused (contract 7.4, inferred rules).
export default function CodObjectionModal({ open, orderPublicId, onClose }) {
  const dispatch = useDispatch()
  const toast = useToast()
  const formId = useId()
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    if (!text.trim()) return setError('Tell us what happened.')
    setSaving(true)
    try {
      await dispatch(submitCodObjection({ publicId: orderPublicId, text: text.trim() })).unwrap()
      toast.success('Thanks. Our team will review your dispute.')
      setText('')
      onClose()
    } catch (err) {
      // OBJECTION_NOT_ALLOWED (window passed) carries the reason in its message.
      setError(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Dispute the refused delivery"
      description="If you did not refuse this parcel, tell us what happened. A refused cash-on-delivery order counts against your account."
      dismissible={!saving}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form={formId} loading={saving}>
            Send dispute
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={submit} noValidate className="space-y-4">
        {error && <FormAlert>{error}</FormAlert>}
        <FormField label="What happened?" required>
          <Textarea value={text} onChange={(e) => setText(e.target.value)} maxLength={LIMITS.longText} rows={5} />
        </FormField>
      </form>
    </Modal>
  )
}
