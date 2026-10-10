import { useId, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import * as ordersApi from '@/api/orders'
import { errorMessage } from '@/config/errorMessages'
import { MAX_OTHER_CHARGES } from '@/config/merchant'
import { useMyCouriers } from '@/hooks/useMyCouriers'
import { formatMoney } from '@/utils/format'
import { compactErrors, REGEX, validateMoney } from '@/utils/validators'
import { splitApiError } from '@/utils/formErrors'
import FormAlert from '@/components/common/FormAlert'
import CourierField from '@/components/merchant/CourierField'
import Button from '@/components/ui/Button'
import FormField from '@/components/ui/FormField'
import IconButton from '@/components/ui/IconButton'
import Input from '@/components/ui/Input'
import Modal from '@/components/ui/Modal'
import MoneyInput from '@/components/ui/MoneyInput'
import Skeleton from '@/components/ui/Skeleton'

const CHARGE_LABEL_MAX = 100

const variantText = (item) =>
  item.variantName ||
  (item.attributes && typeof item.attributes === 'object'
    ? Object.entries(item.attributes)
        .map(([k, v]) => `${k}: ${v}`)
        .join(' · ')
    : '')

function initialForm(order) {
  const a = order.amounts ?? {}
  const isRequote = order.quoteRevision > 0 || a.courierCode
  return {
    // Start from the quantities the last quote kept (the ordered quantity before the first quote).
    lines: Object.fromEntries(order.items.map((i) => [i.variantPublicId, String(i.quantity ?? i.orderedQuantity)])),
    courierCode: a.courierCode ?? '',
    courierCharge: isRequote && a.courierCharge != null ? String(a.courierCharge) : '',
    otherCharges: (a.otherCharges ?? []).map((c) => ({ label: c.label, amount: String(c.amount) })),
    quoteDiscount: Number(a.quoteDiscount) > 0 ? String(a.quoteDiscount) : '',
  }
}

function validate(form, order) {
  const errors = {}
  let kept = 0
  for (const item of order.items) {
    const raw = form.lines[item.variantPublicId]
    const max = item.orderedQuantity ?? item.quantity
    const n = Number(raw)
    if (raw === '' || !Number.isInteger(n) || n < 0 || n > max) errors[`line.${item.variantPublicId}`] = `Enter 0 to ${max}.`
    else if (n > 0) kept += 1
  }
  if (!Object.keys(errors).length && kept === 0) errors.lines = 'Keep at least one item. To refuse the whole order, reject it instead.'
  if (!form.courierCode) errors.courierCode = 'Choose a courier.'
  else if (!REGEX.code.test(form.courierCode)) errors.courierCode = 'Use capital letters, digits or _ (2 to 20 characters).'
  errors.courierCharge = validateMoney(form.courierCharge, { allowZero: true })
  form.otherCharges.forEach((c, i) => {
    if (!c.label.trim()) errors[`charge.${i}.label`] = 'Add a label.'
    errors[`charge.${i}.amount`] = validateMoney(c.amount)
  })
  errors.quoteDiscount = validateMoney(form.quoteDiscount, { required: false })
  return compactErrors(errors)
}

function toBody(form, order) {
  const body = {
    // Every line is sent; quantity 0 removes it.
    lines: order.items.map((i) => ({ variantPublicId: i.variantPublicId, quantity: Number(form.lines[i.variantPublicId]) })),
    courierCode: form.courierCode,
    courierCharge: Number(form.courierCharge),
    otherCharges: form.otherCharges.map((c) => ({ label: c.label.trim(), amount: Number(c.amount) })),
  }
  if (form.quoteDiscount !== '') body.quoteDiscount = Number(form.quoteDiscount)
  return body
}

// What the customer will see. Display only: the grand total comes from the server after sending.
function QuotePreview({ form, order }) {
  return (
    <div className="rounded-xl bg-slate-50 p-4 text-sm dark:bg-slate-800/50">
      <h3 className="font-semibold text-slate-900 dark:text-white">What the customer will see</h3>
      <ul className="mt-3 space-y-1.5">
        {order.items.map((item) => {
          const qty = Number(form.lines[item.variantPublicId])
          return (
            <li key={item.variantPublicId} className={qty === 0 ? 'text-slate-400 line-through' : 'text-slate-700 dark:text-slate-300'}>
              {item.name} × {Number.isFinite(qty) ? qty : '?'} at {formatMoney(item.unitPrice)} each
            </li>
          )
        })}
      </ul>
      <dl className="mt-3 space-y-1 border-t border-slate-200 pt-3 dark:border-slate-700">
        <div className="flex justify-between gap-4">
          <dt>Delivery{form.courierCode ? ` (${form.courierCode})` : ''}</dt>
          <dd className="tabular-nums">{form.courierCharge === '' ? '—' : formatMoney(form.courierCharge)}</dd>
        </div>
        {form.otherCharges.map((c, i) => (
          <div key={i} className="flex justify-between gap-4">
            <dt>{c.label || 'Other charge'}</dt>
            <dd className="tabular-nums">{c.amount === '' ? '—' : formatMoney(c.amount)}</dd>
          </div>
        ))}
        {form.quoteDiscount !== '' && (
          <div className="flex justify-between gap-4">
            <dt>Store discount</dt>
            <dd className="tabular-nums">− {formatMoney(form.quoteDiscount)}</dd>
          </div>
        )}
      </dl>
      <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
        The total is calculated by the marketplace when you send the quote, and appears on the order.
      </p>
    </div>
  )
}

export default function QuoteForm({ open, order, onClose, act, onDone }) {
  const formId = useId()
  const { couriers, loading: couriersLoading } = useMyCouriers()
  const [form, setForm] = useState(() => initialForm(order))
  const [errors, setErrors] = useState({})
  const [formMessage, setFormMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const isRequote = order.status === 'AWAITING_CUSTOMER_CONFIRMATION'
  const isCod = order.paymentMethod === 'COD'

  const set = (patch) => setForm((f) => ({ ...f, ...patch }))
  const setLine = (id, value) => setForm((f) => ({ ...f, lines: { ...f.lines, [id]: value.replace(/\D/g, '') } }))
  const setCharge = (index, patch) => setForm((f) => ({ ...f, otherCharges: f.otherCharges.map((c, i) => (i === index ? { ...c, ...patch } : c)) }))

  const submit = async (event) => {
    event.preventDefault()
    const problems = validate(form, order)
    setErrors(problems)
    setFormMessage('')
    if (Object.keys(problems).length) return
    setBusy(true)
    try {
      await act(() => ordersApi.quoteOrder(order.publicId, toBody(form, order)))
      onDone(isRequote ? 'New quote sent to the customer.' : 'Quote sent to the customer.')
    } catch (err) {
      const { fieldErrors } = splitApiError(err)
      setErrors(fieldErrors)
      // INVALID_QUOTE, COURIER_NOT_AVAILABLE and QUOTE_REVISION_LIMIT_REACHED are shown at the top.
      setFormMessage(errorMessage(err))
      if (err?.code === 'INVALID_ORDER_STATE') onClose()
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={busy ? undefined : onClose}
      dismissible={!busy}
      size="xl"
      title={isRequote ? `Change the quote (revision ${order.quoteRevision ?? 0} sent)` : 'Send a quote'}
      description="Lower quantities if you cannot supply everything, then add delivery and any other charges. The customer confirms before paying."
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" form={formId} loading={busy}>
            {isRequote ? 'Send new quote' : 'Send quote'}
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={submit} noValidate className="grid gap-6 lg:grid-cols-[1fr_18rem]">
        <div className="space-y-5">
          {formMessage && <FormAlert>{formMessage}</FormAlert>}
          {isRequote && (
            <FormAlert tone="info">
              A store can change a quote only a limited number of times. The marketplace tells you when the limit is reached.
            </FormAlert>
          )}

          <fieldset>
            <legend className="text-sm font-semibold text-slate-900 dark:text-white">Items</legend>
            <p className="text-xs text-slate-500 dark:text-slate-400">Quantity can only go down. 0 removes the item.</p>
            <ul className="mt-2 divide-y divide-slate-100 dark:divide-slate-800">
              {order.items.map((item) => {
                const max = item.orderedQuantity ?? item.quantity
                return (
                  <li key={item.variantPublicId} className="flex flex-wrap items-start justify-between gap-3 py-3">
                    <div className="min-w-0 flex-1 text-sm">
                      <p className="font-medium text-slate-900 dark:text-white">{item.name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {[variantText(item), item.sku && `SKU ${item.sku}`].filter(Boolean).join(' · ')}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Customer asked for {max} · {formatMoney(item.unitPrice)} each
                      </p>
                    </div>
                    <FormField label="Quantity" error={errors[`line.${item.variantPublicId}`]} className="w-28">
                      <Input
                        inputMode="numeric"
                        value={form.lines[item.variantPublicId]}
                        onChange={(e) => setLine(item.variantPublicId, e.target.value)}
                        aria-label={`Quantity of ${item.name}, 0 to ${max}`}
                      />
                    </FormField>
                  </li>
                )
              })}
            </ul>
            {errors.lines && (
              <p role="alert" className="text-sm font-medium text-danger-600 dark:text-danger-400">
                {errors.lines}
              </p>
            )}
          </fieldset>

          <div className="grid gap-4 sm:grid-cols-2">
            {couriersLoading ? (
              <Skeleton className="h-16" />
            ) : (
              <CourierField couriers={couriers} codOnly={isCod} value={form.courierCode} onChange={(v) => set({ courierCode: v })} error={errors.courierCode} />
            )}
            <FormField label="Delivery charge" required error={errors.courierCharge} hint="Use 0 for free delivery.">
              <MoneyInput value={form.courierCharge} onChange={(v) => set({ courierCharge: v })} />
            </FormField>
          </div>

          <fieldset className="space-y-3">
            <legend className="text-sm font-semibold text-slate-900 dark:text-white">Other charges</legend>
            {form.otherCharges.map((charge, i) => (
              <div key={i} className="flex items-start gap-2">
                <FormField label="Label" error={errors[`charge.${i}.label`]} className="flex-1">
                  <Input value={charge.label} maxLength={CHARGE_LABEL_MAX} onChange={(e) => setCharge(i, { label: e.target.value })} placeholder="Packaging" />
                </FormField>
                <FormField label="Amount" error={errors[`charge.${i}.amount`]} className="w-40">
                  <MoneyInput value={charge.amount} onChange={(v) => setCharge(i, { amount: v })} />
                </FormField>
                <IconButton
                  icon={Trash2}
                  label={`Remove charge ${charge.label || i + 1}`}
                  variant="danger"
                  className="mt-7"
                  onClick={() => set({ otherCharges: form.otherCharges.filter((_, j) => j !== i) })}
                />
              </div>
            ))}
            {form.otherCharges.length < MAX_OTHER_CHARGES && (
              <Button variant="ghost" size="sm" leftIcon={Plus} onClick={() => set({ otherCharges: [...form.otherCharges, { label: '', amount: '' }] })}>
                Add a charge
              </Button>
            )}
          </fieldset>

          <FormField label="Quote discount" error={errors.quoteDiscount} hint="Optional. Taken off the total." className="sm:w-1/2">
            <MoneyInput value={form.quoteDiscount} onChange={(v) => set({ quoteDiscount: v })} />
          </FormField>
        </div>

        <div className="lg:sticky lg:top-0 lg:self-start">
          <QuotePreview form={form} order={order} />
        </div>
      </form>
    </Modal>
  )
}
