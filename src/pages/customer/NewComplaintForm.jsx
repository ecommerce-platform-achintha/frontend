import { useState } from 'react'
import * as ordersApi from '@/api/orders'
import { ENUMS } from '@/config/enums'
import { MAX_ATTACHMENTS } from '@/config/constants'
import { COMPLAINT_TEXT_MAX, COMPLAINT_TYPE_LABELS } from '@/config/orders'
import { errorMessage } from '@/config/errorMessages'
import { fieldErrorsToMap } from '@/api/client'
import FormAlert from '@/components/common/FormAlert'
import Button from '@/components/ui/Button'
import FilePicker from '@/components/ui/FilePicker'
import FormField from '@/components/ui/FormField'
import Select from '@/components/ui/Select'
import Textarea from '@/components/ui/Textarea'

/**
 * New complaint for one order (opened from an order page via /complaints?order=ORD-...).
 * COMPLAINT_NOT_ALLOWED is shown with the server's reason (e.g. outside the complaint window).
 */
export default function NewComplaintForm({ orderPublicId, onCreated, onCancel }) {
  const [values, setValues] = useState({ type: '', text: '', attachmentKeys: [] })
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  const set = (field, value) => {
    setValues((v) => ({ ...v, [field]: value }))
    if (errors[field]) setErrors((e) => ({ ...e, [field]: '' }))
  }

  const submit = async (event) => {
    event.preventDefault()
    setFormError('')
    const clientErrors = {}
    if (!values.type) clientErrors.type = 'Choose what went wrong.'
    if (!values.text.trim()) clientErrors.text = 'Describe the problem.'
    setErrors(clientErrors)
    if (Object.keys(clientErrors).length) return
    setSaving(true)
    try {
      const created = await ordersApi.createComplaint({
        orderPublicId,
        type: values.type,
        text: values.text.trim(),
        attachmentKeys: values.attachmentKeys.length ? values.attachmentKeys : undefined,
      })
      onCreated(created)
    } catch (error) {
      const fields = fieldErrorsToMap(error)
      setErrors(fields)
      if (!Object.keys(fields).length) setFormError(errorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      {formError && <FormAlert>{formError}</FormAlert>}
      <FormField label="What went wrong?" error={errors.type} required>
        <Select
          value={values.type}
          onChange={(e) => set('type', e.target.value)}
          placeholder="Choose"
          options={ENUMS.ComplaintType.map((t) => ({ value: t, label: COMPLAINT_TYPE_LABELS[t] }))}
        />
      </FormField>
      <FormField label="Details" hint="What happened, and what would put it right?" error={errors.text} required>
        <Textarea value={values.text} onChange={(e) => set('text', e.target.value)} maxLength={COMPLAINT_TEXT_MAX} rows={6} />
      </FormField>
      <FormField label="Photos or documents" hint={`Optional, up to ${MAX_ATTACHMENTS}.`}>
        <FilePicker
          value={values.attachmentKeys}
          onChange={(keys) => set('attachmentKeys', keys)}
          maxFiles={MAX_ATTACHMENTS}
          folder="complaints"
          accept="image/*,application/pdf"
          label="Add files"
        />
      </FormField>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="outline" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" loading={saving}>
          Send complaint
        </Button>
      </div>
    </form>
  )
}
