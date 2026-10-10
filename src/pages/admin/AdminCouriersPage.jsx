import { useId, useState } from 'react'
import * as adminApi from '@/api/admin'
import { adminLists } from '@/store/slices/adminLists'
import { TRACKING_PLACEHOLDER } from '@/config/admin'
import { errorMessage } from '@/config/errorMessages'
import { splitApiError } from '@/utils/formErrors'
import { compactErrors, REGEX } from '@/utils/validators'
import MasterDataPage from '@/components/admin/MasterDataPage'
import FormAlert from '@/components/common/FormAlert'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import FormField from '@/components/ui/FormField'
import Input from '@/components/ui/Input'
import Modal from '@/components/ui/Modal'
import Switch from '@/components/ui/Switch'

const NAME_MAX = 100
const URL_MAX = 500
const REGEX_MAX = 200

const COLUMNS = [
  { key: 'code', header: 'Code', primary: true, render: (c) => <span className="font-mono font-medium">{c.code}</span> },
  { key: 'name', header: 'Name' },
  { key: 'codSupported', header: 'COD', render: (c) => (c.codSupported ? 'Supported' : 'No') },
  { key: 'trackingNumberRegex', header: 'Tracking format', hideOnMobile: true, render: (c) => <code className="text-xs">{c.trackingNumberRegex}</code> },
  { key: 'active', header: 'Status', render: (c) => <Badge tone={c.active !== false ? 'success' : 'neutral'}>{c.active !== false ? 'Active' : 'Inactive'}</Badge> },
]

// Compiles the pattern as the server will apply it (whole value). Returns null for an invalid pattern.
function compile(pattern) {
  try {
    return new RegExp(`^(?:${pattern})$`)
  } catch {
    return null
  }
}

function validateTemplate(url) {
  const v = url.trim()
  if (!v) return 'Tracking URL template is required.'
  let parsed
  try {
    parsed = new URL(v.replace(TRACKING_PLACEHOLDER, 'X'))
  } catch {
    return 'Enter a full URL.'
  }
  if (parsed.protocol !== 'https:') return 'The URL must start with https://.'
  if (!v.includes(TRACKING_PLACEHOLDER)) return `The URL must contain ${TRACKING_PLACEHOLDER}.`
  return ''
}

// SUPER ADMIN. The code is the courier's id and cannot change after creation.
function CourierForm({ item, onClose, onSaved }) {
  const formId = useId()
  const [form, setForm] = useState({
    code: item?.code ?? '',
    name: item?.name ?? '',
    trackingUrlTemplate: item?.trackingUrlTemplate ?? '',
    trackingNumberRegex: item?.trackingNumberRegex ?? '',
    codSupported: Boolean(item?.codSupported),
    active: item ? item.active !== false : true,
  })
  const [sample, setSample] = useState('')
  const [errors, setErrors] = useState({})
  const [formMessage, setFormMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const set = (patch) => setForm((f) => ({ ...f, ...patch }))

  const regex = form.trackingNumberRegex ? compile(form.trackingNumberRegex) : null
  const sampleResult = !sample || !form.trackingNumberRegex ? null : !regex ? 'invalid' : regex.test(sample) ? 'match' : 'no-match'

  const submit = async (event) => {
    event.preventDefault()
    const next = compactErrors({
      code: item ? '' : REGEX.code.test(form.code) ? '' : 'Capital letter first, then capitals, digits or _ (2 to 20).',
      name: form.name.trim() ? '' : 'Name is required.',
      trackingUrlTemplate: validateTemplate(form.trackingUrlTemplate),
      trackingNumberRegex: !form.trackingNumberRegex ? 'Tracking number format is required.' : !regex ? 'This is not a valid regular expression.' : '',
    })
    setErrors(next)
    setFormMessage('')
    if (Object.keys(next).length) return
    const body = {
      name: form.name.trim(),
      trackingUrlTemplate: form.trackingUrlTemplate.trim(),
      trackingNumberRegex: form.trackingNumberRegex,
      codSupported: form.codSupported,
      active: form.active,
    }
    setBusy(true)
    try {
      if (item) await adminApi.updateCourier(item.code, body)
      else await adminApi.createCourier({ code: form.code, ...body })
      onSaved(item ? 'Courier saved.' : 'Courier created.')
    } catch (err) {
      const { fieldErrors } = splitApiError(err)
      if (err?.code === 'COURIER_CODE_TAKEN') fieldErrors.code = errorMessage(err)
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
      title={item ? `Edit ${item.code}` : 'New courier'}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" form={formId} loading={busy}>
            Save courier
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={submit} noValidate className="space-y-4">
        {formMessage && <FormAlert>{formMessage}</FormAlert>}
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Code" required={!item} error={errors.code} hint={item ? 'Codes cannot change.' : 'For example DOMEX. Cannot change later.'}>
            <Input value={form.code} onChange={(e) => set({ code: e.target.value.toUpperCase() })} disabled={Boolean(item)} maxLength={20} />
          </FormField>
          <FormField label="Name" required error={errors.name}>
            <Input value={form.name} onChange={(e) => set({ name: e.target.value })} maxLength={NAME_MAX} />
          </FormField>
        </div>
        <FormField label="Tracking URL template" required error={errors.trackingUrlTemplate} hint={`https only, with ${TRACKING_PLACEHOLDER} where the number goes.`}>
          <Input value={form.trackingUrlTemplate} onChange={(e) => set({ trackingUrlTemplate: e.target.value })} maxLength={URL_MAX} placeholder={`https://track.example.lk/${TRACKING_PLACEHOLDER}`} spellCheck={false} />
        </FormField>
        <FormField label="Tracking number format" required error={errors.trackingNumberRegex} hint="A regular expression the whole tracking number must match, for example [A-Z]{2}\d{8}.">
          <Input value={form.trackingNumberRegex} onChange={(e) => set({ trackingNumberRegex: e.target.value })} maxLength={REGEX_MAX} className="font-mono" spellCheck={false} />
        </FormField>
        <FormField
          label="Try a tracking number"
          hint={
            sampleResult === 'match'
              ? '✓ Matches the format.'
              : sampleResult === 'no-match'
                ? '✗ Does not match the format.'
                : sampleResult === 'invalid'
                  ? 'Fix the format first: it is not a valid regular expression.'
                  : 'Optional: check the format before saving.'
          }
        >
          <Input value={sample} onChange={(e) => setSample(e.target.value)} spellCheck={false} />
        </FormField>
        <Switch checked={form.codSupported} onChange={(v) => set({ codSupported: v })} label="Supports cash on delivery" />
        <Switch checked={form.active} onChange={(v) => set({ active: v })} label="Active" description="Inactive couriers cannot be chosen by stores." />
      </form>
    </Modal>
  )
}

export default function AdminCouriersPage() {
  return (
    <MasterDataPage
      title="Couriers"
      description="Couriers stores can ship with."
      noun="courier"
      resource={adminLists.couriers}
      columns={COLUMNS}
      Form={CourierForm}
      inUseCode="COURIER_IN_USE"
      remove={(c) => adminApi.deleteCourier(c.code)}
      deactivate={(c) =>
        adminApi.updateCourier(c.code, {
          name: c.name,
          trackingUrlTemplate: c.trackingUrlTemplate,
          trackingNumberRegex: c.trackingNumberRegex,
          codSupported: c.codSupported,
          active: false,
        })
      }
    />
  )
}
