import { useId, useState } from 'react'
import * as catalogApi from '@/api/catalog'
import { errorMessage } from '@/config/errorMessages'
import { PERCENT_RANGE } from '@/config/merchant'
import { useAsync } from '@/hooks/useAsync'
import { fromColomboInput, toColomboInput } from '@/utils/format'
import { splitApiError } from '@/utils/formErrors'
import { compactErrors, validateMoney } from '@/utils/validators'
import FormAlert from '@/components/common/FormAlert'
import ProductPicker from '@/components/merchant/ProductPicker'
import Button from '@/components/ui/Button'
import FormField from '@/components/ui/FormField'
import Input from '@/components/ui/Input'
import Modal from '@/components/ui/Modal'
import MoneyInput from '@/components/ui/MoneyInput'
import Select from '@/components/ui/Select'
import Switch from '@/components/ui/Switch'

const NAME_MAX = 100

const SCOPE_OPTIONS = [
  { value: 'PRODUCT', label: 'Whole product (all variants)' },
  { value: 'VARIANT', label: 'One variant' },
]
const TYPE_OPTIONS = [
  { value: 'PERCENT', label: 'Percentage off' },
  { value: 'FIXED', label: 'Fixed amount off (LKR)' },
]

function toForm(discount) {
  return {
    name: discount?.name ?? '',
    scope: discount?.scope ?? 'PRODUCT',
    productPublicId: discount?.productPublicId ?? '',
    variantPublicId: discount?.variantPublicId ?? '',
    type: discount?.type ?? 'PERCENT',
    value: discount?.value != null ? String(discount.value) : '',
    startsAt: toColomboInput(discount?.startsAt),
    endsAt: toColomboInput(discount?.endsAt),
    active: discount ? discount.active !== false : true,
  }
}

function validate(form) {
  const errors = {}
  if (form.name.length > NAME_MAX) errors.name = `Up to ${NAME_MAX} characters.`
  if (!form.productPublicId) errors.productPublicId = 'Choose a product.'
  if (form.scope === 'VARIANT' && !form.variantPublicId) errors.variantPublicId = 'Choose a variant.'
  const money = validateMoney(form.value)
  if (money) errors.value = money
  else if (form.type === 'PERCENT' && (Number(form.value) < PERCENT_RANGE.min || Number(form.value) > PERCENT_RANGE.max))
    errors.value = `Use ${PERCENT_RANGE.min} to ${PERCENT_RANGE.max} percent.`
  if (form.startsAt && !fromColomboInput(form.startsAt)) errors.startsAt = 'Enter a valid date and time.'
  if (form.endsAt && !fromColomboInput(form.endsAt)) errors.endsAt = 'Enter a valid date and time.'
  if (form.startsAt && form.endsAt && fromColomboInput(form.endsAt) <= fromColomboInput(form.startsAt)) errors.endsAt = 'The end must be after the start.'
  return compactErrors(errors)
}

function toBody(form) {
  const body = {
    scope: form.scope,
    productPublicId: form.productPublicId,
    type: form.type,
    value: Number(form.value),
    active: form.active,
    // Typed in Colombo time, sent as UTC ISO strings.
    startsAt: fromColomboInput(form.startsAt),
    endsAt: fromColomboInput(form.endsAt),
  }
  if (form.name.trim()) body.name = form.name.trim()
  if (form.scope === 'VARIANT') body.variantPublicId = form.variantPublicId
  return body
}

function VariantSelect({ productPublicId, value, onChange, ...field }) {
  const { data, status } = useAsync(() => catalogApi.getMerchantProduct(productPublicId), productPublicId || null)
  const variants = data?.variants ?? []
  return (
    <Select value={value} onChange={(e) => onChange(e.target.value)} disabled={!productPublicId || status === 'loading'} {...field}>
      <option value="">{!productPublicId ? 'Choose a product first' : status === 'loading' ? 'Loading variants…' : 'Choose a variant'}</option>
      {variants.map((v) => (
        <option key={v.publicId} value={v.publicId}>
          {v.label || Object.values(v.attributes ?? {}).join(' / ') || v.sku} ({v.sku})
        </option>
      ))}
    </Select>
  )
}

// Create or edit a discount. `discount` is null when creating.
export default function DiscountForm({ discount, onClose, onSaved }) {
  const formId = useId()
  const [form, setForm] = useState(() => toForm(discount))
  const [errors, setErrors] = useState({})
  const [formMessage, setFormMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const set = (patch) => setForm((f) => ({ ...f, ...patch }))

  const submit = async (event) => {
    event.preventDefault()
    const problems = validate(form)
    setErrors(problems)
    setFormMessage('')
    if (Object.keys(problems).length) return
    setBusy(true)
    try {
      const body = toBody(form)
      if (discount) await catalogApi.updateDiscount(discount.publicId, body)
      else await catalogApi.createDiscount(body)
      onSaved(discount ? 'Discount updated.' : 'Discount created.')
    } catch (err) {
      const { fieldErrors } = splitApiError(err)
      setErrors(fieldErrors)
      // INVALID_DISCOUNT explains the rule that failed (e.g. a fixed amount that leaves no price).
      setFormMessage(errorMessage(err))
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
      title={discount ? 'Edit discount' : 'New discount'}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" form={formId} loading={busy}>
            {discount ? 'Save discount' : 'Create discount'}
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={submit} noValidate className="space-y-4">
        {formMessage && <FormAlert>{formMessage}</FormAlert>}
        <FormAlert tone="info">Discounts do not stack: when several apply to an item, customers get only the single best one.</FormAlert>
        <FormField label="Name" hint="Optional. Shown to customers, for example “Avurudu sale”." error={errors.name}>
          <Input value={form.name} onChange={(e) => set({ name: e.target.value })} maxLength={NAME_MAX} />
        </FormField>
        <FormField label="Applies to" required>
          <Select value={form.scope} onChange={(e) => set({ scope: e.target.value, variantPublicId: '' })} options={SCOPE_OPTIONS} />
        </FormField>
        <FormField label="Product" required error={errors.productPublicId}>
          <ProductPicker value={form.productPublicId} onChange={(id) => set({ productPublicId: id, variantPublicId: '' })} />
        </FormField>
        {form.scope === 'VARIANT' && (
          <FormField label="Variant" required error={errors.variantPublicId}>
            <VariantSelect productPublicId={form.productPublicId} value={form.variantPublicId} onChange={(id) => set({ variantPublicId: id })} />
          </FormField>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Type" required>
            <Select value={form.type} onChange={(e) => set({ type: e.target.value })} options={TYPE_OPTIONS} />
          </FormField>
          <FormField
            label={form.type === 'PERCENT' ? 'Percent off' : 'Amount off'}
            required
            error={errors.value}
            hint={form.type === 'PERCENT' ? `${PERCENT_RANGE.min} to ${PERCENT_RANGE.max}.` : 'The price must stay above 0.'}
          >
            {form.type === 'PERCENT' ? (
              <Input inputMode="decimal" value={form.value} onChange={(e) => set({ value: e.target.value.replace(/[^\d.]/g, '') })} />
            ) : (
              <MoneyInput value={form.value} onChange={(v) => set({ value: v })} />
            )}
          </FormField>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Starts" hint="Sri Lanka time. Optional." error={errors.startsAt}>
            <Input type="datetime-local" value={form.startsAt} onChange={(e) => set({ startsAt: e.target.value })} />
          </FormField>
          <FormField label="Ends" hint="Sri Lanka time. Optional." error={errors.endsAt}>
            <Input type="datetime-local" value={form.endsAt} onChange={(e) => set({ endsAt: e.target.value })} />
          </FormField>
        </div>
        <Switch checked={form.active} onChange={(v) => set({ active: v })} label="Active" description="Turn off to pause the discount without deleting it." />
      </form>
    </Modal>
  )
}
