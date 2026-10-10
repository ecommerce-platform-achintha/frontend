import { useId, useState } from 'react'
import * as catalogApi from '@/api/catalog'
import { errorMessage } from '@/config/errorMessages'
import { LIMITS, validateReason } from '@/utils/validators'
import FormAlert from '@/components/common/FormAlert'
import Button from '@/components/ui/Button'
import FormField from '@/components/ui/FormField'
import Input from '@/components/ui/Input'
import Modal from '@/components/ui/Modal'
import Select from '@/components/ui/Select'
import Textarea from '@/components/ui/Textarea'

const MODES = [
  { value: 'DELTA', label: 'Add or remove units' },
  { value: 'SET', label: 'Set available units to' },
]

/**
 * Stock change for one variant (STOCK_EDIT). Sends `expectedVersion` from the last read.
 * Reserved units belong to open orders and cannot be edited here.
 * On a 409 (someone changed the stock, or the result would go below 0) the product is reloaded
 * via `onReload()` (returns the fresh product) and the change is explained.
 */
export default function StockEditor({ variant, onClose, onSaved, onReload }) {
  const formId = useId()
  const [mode, setMode] = useState('DELTA')
  const [quantity, setQuantity] = useState('')
  const [reason, setReason] = useState('')
  const [errors, setErrors] = useState({})
  const [formMessage, setFormMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const stock = variant.stock ?? {}

  const validate = () => {
    const next = {}
    const q = quantity.trim()
    if (mode === 'SET' && !/^\d+$/.test(q)) next.quantity = 'Enter 0 or more.'
    if (mode === 'DELTA' && (!/^-?\d+$/.test(q) || Number(q) === 0)) next.quantity = 'Enter a whole number, for example 5 or -2.'
    const r = validateReason(reason)
    if (r) next.reason = r
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
      await catalogApi.updateVariantStock(variant.publicId, {
        mode,
        quantity: Number(quantity),
        reason: reason.trim(),
        expectedVersion: stock.version,
      })
      onSaved()
    } catch (err) {
      if (err?.status === 409) {
        const before = { available: stock.quantityAvailable, reserved: stock.reservedQuantity }
        const fresh = await onReload().catch(() => null)
        const now = fresh?.variants?.find((v) => v.publicId === variant.publicId)?.stock
        if (now && (now.quantityAvailable !== before.available || now.reservedQuantity !== before.reserved)) {
          setFormMessage(
            `The stock changed while you were editing: available ${before.available} → ${now.quantityAvailable}, reserved ${before.reserved} → ${now.reservedQuantity}. Check the numbers and save again.`,
          )
        } else {
          // Same numbers: the change itself was refused (e.g. it would leave fewer than 0 units).
          setFormMessage(errorMessage(err, 'This change would leave fewer than 0 available units.'))
        }
      } else {
        setFormMessage(errorMessage(err))
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      dismissible={!busy}
      size="sm"
      title={`Stock for ${variant.label || variant.sku}`}
      description={`SKU ${variant.sku}`}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" form={formId} loading={busy}>
            Save stock
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={submit} noValidate className="space-y-4">
        {formMessage && <FormAlert>{formMessage}</FormAlert>}
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
            <dt className="text-xs text-slate-500 dark:text-slate-400">Available</dt>
            <dd className="text-lg font-semibold tabular-nums">{stock.quantityAvailable ?? '—'}</dd>
          </div>
          <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
            <dt className="text-xs text-slate-500 dark:text-slate-400">Reserved for orders</dt>
            <dd className="text-lg font-semibold tabular-nums">{stock.reservedQuantity ?? '—'}</dd>
          </div>
        </dl>
        <p className="text-xs text-slate-500 dark:text-slate-400">Reserved units belong to open orders and cannot be changed here.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField label="Change">
            <Select value={mode} onChange={(e) => setMode(e.target.value)} options={MODES} />
          </FormField>
          <FormField label={mode === 'SET' ? 'Available units' : 'Units (+ or −)'} required error={errors.quantity}>
            <Input inputMode="numeric" value={quantity} onChange={(e) => setQuantity(e.target.value.replace(/[^\d-]/g, ''))} />
          </FormField>
        </div>
        <FormField label="Reason" required error={errors.reason} hint="Kept with the stock history, for example “New delivery” or “Damaged”.">
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} maxLength={LIMITS.reason} rows={2} />
        </FormField>
      </form>
    </Modal>
  )
}
