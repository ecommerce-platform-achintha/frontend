import { useId, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import * as storesApi from '@/api/stores'
import { SRI_LANKA_DISTRICTS } from '@/config/districts'
import { ENUMS } from '@/config/enums'
import { errorMessage } from '@/config/errorMessages'
import { SHIPPING_RULE_LABELS, WEIGHT_DECIMALS } from '@/config/merchant'
import { splitApiError } from '@/utils/formErrors'
import { compactErrors, validateMoney } from '@/utils/validators'
import FormAlert from '@/components/common/FormAlert'
import Button from '@/components/ui/Button'
import FormField from '@/components/ui/FormField'
import IconButton from '@/components/ui/IconButton'
import Input from '@/components/ui/Input'
import Modal from '@/components/ui/Modal'
import MoneyInput from '@/components/ui/MoneyInput'
import Select from '@/components/ui/Select'
import Switch from '@/components/ui/Switch'

/*
 * Rate rows: the contract only says `rates[]`. We send { district, amount } for PER_DISTRICT and
 * { maxWeightKg, amount } for WEIGHT_BAND; server fieldErrors are shown if the names differ.
 */
const NAME_MAX = 100
const WEIGHT_REGEX = new RegExp(`^\\d+(\\.\\d{1,${WEIGHT_DECIMALS}})?$`)

const emptyRate = (ruleType) => (ruleType === 'WEIGHT_BAND' ? { maxWeightKg: '', amount: '' } : { district: '', amount: '' })

function toForm(template, courierCode) {
  return {
    courierCode: template?.courierCode ?? courierCode ?? '',
    name: template?.name ?? '',
    ruleType: template?.ruleType ?? 'FLAT',
    baseAmount: template?.baseAmount != null ? String(template.baseAmount) : '',
    rates: (template?.rates ?? []).map((r) =>
      template.ruleType === 'WEIGHT_BAND'
        ? { maxWeightKg: String(r.maxWeightKg ?? ''), amount: String(r.amount ?? '') }
        : { district: r.district ?? '', amount: String(r.amount ?? '') },
    ),
    active: template ? template.active !== false : true,
  }
}

function validate(form) {
  const errors = {}
  if (!form.courierCode) errors.courierCode = 'Choose a courier.'
  if (!form.name.trim()) errors.name = 'Name is required.'
  errors.baseAmount = validateMoney(form.baseAmount, { required: form.ruleType === 'FLAT', allowZero: true })
  if (form.ruleType !== 'FLAT') {
    if (!form.rates.length) errors.rates = 'Add at least one row.'
    const seen = new Set()
    form.rates.forEach((r, i) => {
      errors[`rate.${i}.amount`] = validateMoney(r.amount, { allowZero: true })
      if (form.ruleType === 'PER_DISTRICT') {
        if (!r.district) errors[`rate.${i}.district`] = 'Choose a district.'
        else if (seen.has(r.district)) errors[`rate.${i}.district`] = 'Each district once.'
        seen.add(r.district)
      } else {
        const w = r.maxWeightKg.trim()
        if (!WEIGHT_REGEX.test(w) || Number(w) <= 0) errors[`rate.${i}.maxWeightKg`] = `A weight above 0, up to ${WEIGHT_DECIMALS} decimals.`
        else if (seen.has(Number(w))) errors[`rate.${i}.maxWeightKg`] = 'Each weight once.'
        seen.add(Number(w))
      }
    })
  }
  return compactErrors(errors)
}

function toBody(form) {
  const body = { courierCode: form.courierCode, name: form.name.trim(), ruleType: form.ruleType, active: form.active, rates: [] }
  if (form.baseAmount !== '') body.baseAmount = Number(form.baseAmount)
  if (form.ruleType === 'PER_DISTRICT') body.rates = form.rates.map((r) => ({ district: r.district, amount: Number(r.amount) }))
  if (form.ruleType === 'WEIGHT_BAND')
    body.rates = form.rates
      .map((r) => ({ maxWeightKg: Number(r.maxWeightKg), amount: Number(r.amount) }))
      .sort((a, b) => a.maxWeightKg - b.maxWeightKg)
  return body
}

const BASE_HINT = {
  FLAT: 'The delivery estimate for every order.',
  PER_DISTRICT: 'Optional. Used for districts not listed below.',
  WEIGHT_BAND: 'Optional. Used above the heaviest band.',
}

// `couriers`: the couriers this template may use (enabled, and without a template yet when creating).
export default function ShippingTemplateForm({ template, couriers, onClose, onSaved }) {
  const formId = useId()
  const [form, setForm] = useState(() => toForm(template, couriers.length === 1 ? couriers[0].code : ''))
  const [errors, setErrors] = useState({})
  const [formMessage, setFormMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const set = (patch) => setForm((f) => ({ ...f, ...patch }))
  const setRate = (i, patch) => setForm((f) => ({ ...f, rates: f.rates.map((r, j) => (j === i ? { ...r, ...patch } : r)) }))

  const submit = async (event) => {
    event.preventDefault()
    const problems = validate(form)
    setErrors(problems)
    setFormMessage('')
    if (Object.keys(problems).length) return
    setBusy(true)
    try {
      if (template) await storesApi.updateShippingTemplate(template.publicId, toBody(form))
      else await storesApi.createShippingTemplate(toBody(form))
      onSaved(template ? 'Shipping template saved.' : 'Shipping template created.')
    } catch (err) {
      const { fieldErrors } = splitApiError(err)
      if (err?.code === 'SHIPPING_TEMPLATE_EXISTS' || err?.code === 'COURIER_NOT_ENABLED') fieldErrors.courierCode = errorMessage(err)
      setErrors(fieldErrors)
      if (!Object.keys(fieldErrors).length) setFormMessage(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const courierOptions = couriers.map((c) => ({ value: c.code, label: c.name ?? c.code }))
  if (template && !courierOptions.some((o) => o.value === template.courierCode)) courierOptions.push({ value: template.courierCode, label: template.courierCode })

  return (
    <Modal
      open
      onClose={onClose}
      dismissible={!busy}
      size="lg"
      title={template ? 'Edit shipping template' : 'New shipping template'}
      description="An estimate of what delivery costs with this courier. You still set the real charge in each quote."
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" form={formId} loading={busy}>
            Save template
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={submit} noValidate className="space-y-4">
        {formMessage && <FormAlert>{formMessage}</FormAlert>}
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Courier" required error={errors.courierCode} hint={template ? undefined : 'One template per courier.'}>
            <Select value={form.courierCode} onChange={(e) => set({ courierCode: e.target.value })} options={courierOptions} placeholder="Choose a courier" disabled={Boolean(template)} />
          </FormField>
          <FormField label="Name" required error={errors.name}>
            <Input value={form.name} onChange={(e) => set({ name: e.target.value })} maxLength={NAME_MAX} placeholder="Island-wide estimate" />
          </FormField>
        </div>
        <FormField label="Rule">
          <Select
            value={form.ruleType}
            onChange={(e) => set({ ruleType: e.target.value, rates: e.target.value === 'FLAT' ? [] : [emptyRate(e.target.value)] })}
            options={ENUMS.ShippingRuleType.map((v) => ({ value: v, label: SHIPPING_RULE_LABELS[v] }))}
          />
        </FormField>
        <FormField label={form.ruleType === 'FLAT' ? 'Amount' : 'Base amount'} required={form.ruleType === 'FLAT'} error={errors.baseAmount} hint={BASE_HINT[form.ruleType]}>
          <MoneyInput value={form.baseAmount} onChange={(v) => set({ baseAmount: v })} />
        </FormField>

        {form.ruleType !== 'FLAT' && (
          <fieldset className="space-y-2">
            <legend className="text-sm font-semibold text-slate-900 dark:text-white">{form.ruleType === 'PER_DISTRICT' ? 'Districts' : 'Weight bands'}</legend>
            {form.rates.map((rate, i) => (
              <div key={i} className="flex items-start gap-2">
                {form.ruleType === 'PER_DISTRICT' ? (
                  <FormField label="District" error={errors[`rate.${i}.district`]} className="flex-1">
                    <Select value={rate.district} onChange={(e) => setRate(i, { district: e.target.value })} options={SRI_LANKA_DISTRICTS.map((d) => ({ value: d, label: d }))} placeholder="Choose…" />
                  </FormField>
                ) : (
                  <FormField label="Up to (kg)" error={errors[`rate.${i}.maxWeightKg`]} className="flex-1">
                    <Input inputMode="decimal" value={rate.maxWeightKg} onChange={(e) => setRate(i, { maxWeightKg: e.target.value.replace(/[^\d.]/g, '') })} />
                  </FormField>
                )}
                <FormField label="Amount" error={errors[`rate.${i}.amount`]} className="w-40">
                  <MoneyInput value={rate.amount} onChange={(v) => setRate(i, { amount: v })} />
                </FormField>
                <IconButton icon={Trash2} label="Remove row" variant="danger" className="mt-7" onClick={() => set({ rates: form.rates.filter((_, j) => j !== i) })} />
              </div>
            ))}
            {errors.rates && (
              <p role="alert" className="text-sm font-medium text-danger-600 dark:text-danger-400">
                {errors.rates}
              </p>
            )}
            <Button variant="ghost" size="sm" leftIcon={Plus} onClick={() => set({ rates: [...form.rates, emptyRate(form.ruleType)] })}>
              Add row
            </Button>
          </fieldset>
        )}
        <Switch checked={form.active} onChange={(v) => set({ active: v })} label="Active" />
      </form>
    </Modal>
  )
}
