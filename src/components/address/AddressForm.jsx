import { useState } from 'react'
import { SRI_LANKA_DISTRICTS } from '@/config/districts'
import { errorMessage } from '@/config/errorMessages'
import { fieldErrorsToMap } from '@/api/client'
import { LIMITS } from '@/utils/validators'
import FormAlert from '@/components/common/FormAlert'
import Button from '@/components/ui/Button'
import FormField from '@/components/ui/FormField'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import { addressToForm, toAddressBody, validateAddress } from './addressForm'

/**
 * Add/edit address form, shared by /account/addresses and checkout.
 * `onSubmit(body)` does the API call; if it throws an API error, the form shows field errors
 * under the inputs and the message on top (e.g. ADDRESS_LIMIT_REACHED).
 */
export default function AddressForm({ address, onSubmit, onCancel, submitLabel = 'Save address' }) {
  const [values, setValues] = useState(() => addressToForm(address))
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  const bind = (field) => ({
    value: values[field],
    onChange: (e) => {
      setValues((v) => ({ ...v, [field]: e.target.value }))
      if (errors[field]) setErrors((x) => ({ ...x, [field]: '' }))
    },
  })

  const submit = async (event) => {
    event.preventDefault()
    event.stopPropagation() // the form can live inside another form area (checkout)
    setFormError('')
    const clientErrors = validateAddress(values)
    setErrors(clientErrors)
    if (Object.keys(clientErrors).length) return
    setSaving(true)
    try {
      await onSubmit(toAddressBody(values))
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
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Recipient name" error={errors.recipientName} required>
          <Input autoComplete="name" maxLength={LIMITS.recipientName} {...bind('recipientName')} />
        </FormField>
        <FormField label="Mobile number" hint="For example +94771234567" error={errors.phone} required>
          <Input type="tel" inputMode="tel" autoComplete="tel" maxLength={20} {...bind('phone')} />
        </FormField>
      </div>
      <FormField label="Address line 1" error={errors.line1} required>
        <Input autoComplete="address-line1" maxLength={LIMITS.addressLine} {...bind('line1')} />
      </FormField>
      <FormField label="Address line 2" hint="Optional" error={errors.line2}>
        <Input autoComplete="address-line2" maxLength={LIMITS.addressLine} {...bind('line2')} />
      </FormField>
      <div className="grid gap-4 sm:grid-cols-3">
        <FormField label="City" error={errors.city} required>
          <Input autoComplete="address-level2" maxLength={LIMITS.name} {...bind('city')} />
        </FormField>
        <FormField label="District" error={errors.district} required>
          <Select placeholder="Choose" options={SRI_LANKA_DISTRICTS.map((d) => ({ value: d, label: d }))} {...bind('district')} />
        </FormField>
        <FormField label="Postal code" error={errors.postalCode} required>
          <Input autoComplete="postal-code" maxLength={20} {...bind('postalCode')} />
        </FormField>
      </div>
      <FormField label="Country" error={errors.country}>
        <Input autoComplete="country-name" maxLength={LIMITS.name} {...bind('country')} />
      </FormField>
      <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
        {onCancel && (
          <Button variant="outline" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
        )}
        <Button type="submit" loading={saving}>
          {submitLabel}
        </Button>
      </div>
    </form>
  )
}
