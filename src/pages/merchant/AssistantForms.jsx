// Create an assistant, and the permission checkboxes shared with the detail drawer.
import { useId, useState } from 'react'
import * as usersApi from '@/api/users'
import { errorMessage } from '@/config/errorMessages'
import { PERM_DESCRIPTIONS } from '@/config/merchant'
import { ASSISTANT_PERMISSIONS, PERM_LABELS } from '@/config/permissions'
import { splitApiError } from '@/utils/formErrors'
import {
  compactErrors,
  LIMITS,
  normalizePhone,
  validateEmail,
  validateName,
  validateNic,
  validatePassword,
  validatePhone,
} from '@/utils/validators'
import FormAlert from '@/components/common/FormAlert'
import Button from '@/components/ui/Button'
import Checkbox from '@/components/ui/Checkbox'
import FormField from '@/components/ui/FormField'
import Input from '@/components/ui/Input'
import Modal from '@/components/ui/Modal'
import PasswordInput from '@/components/ui/PasswordInput'

export function PermissionChecklist({ value, onChange, error, disabled }) {
  const toggle = (perm, on) => onChange(on ? [...value, perm] : value.filter((p) => p !== perm))
  return (
    <fieldset disabled={disabled}>
      <legend className="text-sm font-medium text-slate-800 dark:text-slate-200">
        Permissions<span className="ml-0.5 text-danger-600" aria-hidden="true">*</span>
      </legend>
      <div className="mt-2 space-y-1">
        {ASSISTANT_PERMISSIONS.map((perm) => (
          <Checkbox
            key={perm}
            checked={value.includes(perm)}
            onChange={(e) => toggle(perm, e.target.checked)}
            label={PERM_LABELS[perm]}
            description={PERM_DESCRIPTIONS[perm]}
          />
        ))}
      </div>
      {error && (
        <p role="alert" className="mt-1 text-xs font-medium text-danger-600 dark:text-danger-400">
          {error}
        </p>
      )}
    </fieldset>
  )
}

const EMPTY = { email: '', firstName: '', lastName: '', nic: '', phone: '', permissions: [], temporaryPassword: '' }

function validate(form) {
  return compactErrors({
    email: validateEmail(form.email),
    firstName: validateName(form.firstName, 'First name'),
    lastName: validateName(form.lastName, 'Last name'),
    nic: validateNic(form.nic),
    phone: validatePhone(form.phone),
    permissions: form.permissions.length ? '' : 'Choose at least one permission.',
    temporaryPassword: validatePassword(form.temporaryPassword),
  })
}

export function CreateAssistantForm({ onClose, onCreated }) {
  const formId = useId()
  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [formMessage, setFormMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const set = (patch) => setForm((f) => ({ ...f, ...patch }))
  const bind = (name) => ({ value: form[name], onChange: (e) => set({ [name]: e.target.value }) })

  const submit = async (event) => {
    event.preventDefault()
    const problems = validate(form)
    setErrors(problems)
    setFormMessage('')
    if (Object.keys(problems).length) return
    setBusy(true)
    try {
      await usersApi.createAssistant({
        email: form.email.trim(),
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        nic: form.nic.trim(),
        phone: normalizePhone(form.phone),
        permissions: form.permissions,
        temporaryPassword: form.temporaryPassword,
      })
      onCreated()
    } catch (err) {
      const { fieldErrors } = splitApiError(err)
      if (err?.code === 'EMAIL_ALREADY_EXISTS') fieldErrors.email = errorMessage(err)
      if (err?.code === 'NIC_ALREADY_ASSIGNED') fieldErrors.nic = errorMessage(err)
      setErrors(fieldErrors)
      if (!Object.keys(fieldErrors).length) setFormMessage(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      dismissible={!busy}
      size="lg"
      title="Add an assistant"
      description="Assistants sign in with their own account and see only what you allow."
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" form={formId} loading={busy}>
            Create assistant
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={submit} noValidate className="space-y-4" autoComplete="off">
        {formMessage && <FormAlert>{formMessage}</FormAlert>}
        <FormField label="Email" required error={errors.email}>
          <Input {...bind('email')} type="email" maxLength={LIMITS.email} autoComplete="off" />
        </FormField>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="First name" required error={errors.firstName}>
            <Input {...bind('firstName')} maxLength={LIMITS.name} />
          </FormField>
          <FormField label="Last name" required error={errors.lastName}>
            <Input {...bind('lastName')} maxLength={LIMITS.name} />
          </FormField>
          <FormField label="NIC" required error={errors.nic} hint="9 digits and V or X, or 12 digits.">
            <Input {...bind('nic')} maxLength={12} autoComplete="off" />
          </FormField>
          <FormField label="Phone" required error={errors.phone} hint="For example +94771234567.">
            <Input {...bind('phone')} type="tel" autoComplete="off" />
          </FormField>
        </div>
        <PermissionChecklist value={form.permissions} onChange={(permissions) => set({ permissions })} error={errors.permissions} />
        <FormField
          label="Temporary password"
          required
          error={errors.temporaryPassword}
          hint="Share it privately. The assistant must change it the first time they sign in."
        >
          <PasswordInput {...bind('temporaryPassword')} showChecklist autoComplete="new-password" maxLength={LIMITS.passwordMax} />
        </FormField>
      </form>
    </Modal>
  )
}
