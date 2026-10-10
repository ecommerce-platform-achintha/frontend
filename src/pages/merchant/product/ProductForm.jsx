import { useState } from 'react'
import { Images, Plus, RotateCcw, Trash2 } from 'lucide-react'
import { errorMessage } from '@/config/errorMessages'
import { PRODUCT_LIMITS } from '@/config/merchant'
import { splitApiError } from '@/utils/formErrors'
import { cn } from '@/utils/cn'
import CategorySelect from '@/components/catalog/CategorySelect'
import FormAlert from '@/components/common/FormAlert'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import FilePicker from '@/components/ui/FilePicker'
import FormField from '@/components/ui/FormField'
import IconButton from '@/components/ui/IconButton'
import Input from '@/components/ui/Input'
import MoneyInput from '@/components/ui/MoneyInput'
import Select from '@/components/ui/Select'
import Switch from '@/components/ui/Switch'
import Textarea from '@/components/ui/Textarea'
import {
  droppedVariants,
  EMPTY_PRODUCT_FORM,
  mapServerFieldErrors,
  matrixRows,
  productFormToBody,
  productToForm,
  skuTakenField,
  validateProductForm,
} from './productForm'

const STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
]

const comboLabel = (attributes) => Object.values(attributes).join(' / ')

function Section({ title, description, children }) {
  return (
    <Card>
      <Card.Header title={title} description={description} />
      <Card.Body className="space-y-4">{children}</Card.Body>
    </Card>
  )
}

// One variant row: SKU, price, status, initial stock (new variants only) and its own images.
function VariantRow({ label, row, errors, prefix, onChange, onRemove, removed, onRestore }) {
  const [showImages, setShowImages] = useState(false)
  const isNew = !row.publicId
  const err = (field) => errors[`${prefix}${field}`]

  if (removed) {
    return (
      <li className="flex items-center justify-between gap-3 py-3 text-sm text-slate-400">
        <span className="line-through">{label}</span>
        <Button variant="ghost" size="sm" leftIcon={RotateCcw} onClick={onRestore}>
          Restore
        </Button>
      </li>
    )
  }

  return (
    <li className="py-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-slate-900 dark:text-white">
          {label}
          {!isNew && <span className="ml-2 text-xs font-normal text-slate-500">{row.publicId}</span>}
        </p>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" leftIcon={Images} onClick={() => setShowImages((v) => !v)} aria-expanded={showImages}>
            Images ({row.imageKeys.length})
          </Button>
          {onRemove && <IconButton icon={Trash2} label={`Remove ${label}`} variant="danger" size="sm" onClick={onRemove} />}
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <FormField label="SKU" required error={err('sku')}>
          <Input value={row.sku} onChange={(e) => onChange({ sku: e.target.value })} maxLength={64} autoComplete="off" spellCheck={false} />
        </FormField>
        <FormField label="List price" required error={err('listPrice')}>
          <MoneyInput value={row.listPrice} onChange={(v) => onChange({ listPrice: v })} />
        </FormField>
        {isNew ? (
          <FormField label="Initial stock" required error={err('initialStock')}>
            <Input inputMode="numeric" value={row.initialStock} onChange={(e) => onChange({ initialStock: e.target.value.replace(/\D/g, '') })} />
          </FormField>
        ) : (
          <FormField label="Stock" hint="Change stock from the product page.">
            <Input value="Managed separately" disabled />
          </FormField>
        )}
        <FormField label="Status">
          <Select value={row.status} onChange={(e) => onChange({ status: e.target.value })} options={STATUS_OPTIONS} />
        </FormField>
      </div>
      {showImages && (
        <div className="mt-3">
          <FilePicker
            value={row.imageKeys}
            onChange={(keys) => onChange({ imageKeys: keys })}
            maxFiles={PRODUCT_LIMITS.images}
            folder="products"
            label="Add variant images"
          />
        </div>
      )}
    </li>
  )
}

/**
 * Create and edit form. `product` is the last server copy (null when creating).
 * `onSubmit(body)` returns the saved product or throws a normalised API error.
 */
export default function ProductForm({ product, onSubmit, onCancel, submitLabel = 'Save product' }) {
  const isEdit = Boolean(product)
  const [form, setForm] = useState(() => (product ? productToForm(product) : EMPTY_PRODUCT_FORM))
  const [errors, setErrors] = useState({})
  const [formMessage, setFormMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirmDrop, setConfirmDrop] = useState(null) // variants that would become INACTIVE

  const set = (patch) => setForm((f) => ({ ...f, ...patch }))
  const setSimple = (patch) => setForm((f) => ({ ...f, simple: { ...f.simple, ...patch } }))
  const setOption = (i, patch) =>
    setForm((f) => ({
      ...f,
      options: f.options.map((o, j) => (j === i ? { ...o, ...patch } : o)),
    }))
  const setRow = (key, base, patch) =>
    setForm((f) => ({
      ...f,
      rows: { ...f.rows, [key]: { ...base, ...f.rows[key], ...patch } },
    }))
  const toggleRemoved = (key, removed) =>
    setForm((f) => ({
      ...f,
      removed: removed ? [...f.removed, key] : f.removed.filter((k) => k !== key),
    }))

  const rows = form.mode === 'options' ? matrixRows(form) : []
  const activeCount = rows.filter((r) => !r.removed).length

  const save = async () => {
    setBusy(true)
    setFormMessage('')
    const { body, rowKeys } = productFormToBody(form, { isEdit })
    try {
      await onSubmit(body)
    } catch (err) {
      const { fieldErrors } = splitApiError(err)
      const mapped = mapServerFieldErrors(fieldErrors, rowKeys, form.mode)
      if (err?.code === 'SKU_TAKEN' && !Object.keys(mapped).length) mapped[skuTakenField(form, err.message)] = errorMessage(err)
      setErrors(mapped)
      if (!Object.keys(mapped).length || err?.code === 'INVALID_VARIANTS') setFormMessage(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const submit = (event) => {
    event.preventDefault()
    const problems = validateProductForm(form)
    setErrors(problems)
    setFormMessage(Object.keys(problems).length ? 'Some fields need attention. Check the highlighted fields.' : '')
    if (Object.keys(problems).length) return
    // Warn before an edit that drops existing variants: they would become INACTIVE.
    const dropped = isEdit ? droppedVariants(form, product) : []
    if (dropped.length) setConfirmDrop(dropped)
    else save()
  }

  return (
    <>
      <form onSubmit={submit} noValidate className="space-y-6">
        {formMessage && <FormAlert>{formMessage}</FormAlert>}

        <Section title="Basics">
          <FormField label="Name" required error={errors.name}>
            <Input value={form.name} onChange={(e) => set({ name: e.target.value })} maxLength={200} />
          </FormField>
          <FormField label="Description" error={errors.description}>
            <Textarea
              value={form.description}
              onChange={(e) => set({ description: e.target.value })}
              maxLength={PRODUCT_LIMITS.description}
              rows={6}
            />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Category" required error={errors.categorySlug}>
              <CategorySelect value={form.categorySlug} onChange={(slug) => set({ categorySlug: slug })} emptyLabel="Choose a category" />
            </FormField>
            <Switch
              className="sm:pt-7"
              checked={form.codAllowed}
              onChange={(v) => set({ codAllowed: v })}
              label="Allow cash on delivery"
              description="Customers can pay on delivery if your store also accepts it."
            />
          </div>
        </Section>

        <Section title="Images" description={`Up to ${PRODUCT_LIMITS.images} images for the product.`}>
          <FilePicker
            value={form.imageKeys}
            onChange={(keys) => set({ imageKeys: keys })}
            maxFiles={PRODUCT_LIMITS.images}
            folder="products"
            label="Add product images"
          />
        </Section>

        <Section title="Options and variants" description="A simple product has one price and SKU. Use options for sizes, colours and so on.">
          <div role="radiogroup" aria-label="Product type" className="grid gap-2 sm:grid-cols-2">
            {[
              {
                value: 'simple',
                title: 'Simple product',
                text: 'One SKU and one price.',
              },
              {
                value: 'options',
                title: 'With options',
                text: 'Up to 5 options; one variant per combination.',
              },
            ].map((m) => (
              <button
                key={m.value}
                type="button"
                role="radio"
                aria-checked={form.mode === m.value}
                onClick={() => set({ mode: m.value })}
                className={cn(
                  'rounded-xl border p-3 text-left text-sm transition-colors',
                  form.mode === m.value
                    ? 'border-primary-500 bg-primary-50 ring-1 ring-primary-500 dark:bg-primary-500/10'
                    : 'border-slate-200 hover:border-slate-300 dark:border-slate-700',
                )}
              >
                <span className="block font-semibold text-slate-900 dark:text-white">{m.title}</span>
                <span className="text-slate-500 dark:text-slate-400">{m.text}</span>
              </button>
            ))}
          </div>

          {form.mode === 'simple' ? (
            <ul>
              <VariantRow label="Product" row={form.simple} errors={errors} prefix="" onChange={setSimple} />
            </ul>
          ) : (
            <>
              <fieldset className="space-y-3">
                <legend className="text-sm font-semibold text-slate-900 dark:text-white">Options</legend>
                {form.options.map((option, i) => (
                  <div key={i} className="grid gap-2 sm:grid-cols-[12rem_1fr_auto] sm:items-start">
                    <FormField label="Option name" error={errors[`option.${i}.name`]}>
                      <Input value={option.name} onChange={(e) => setOption(i, { name: e.target.value })} placeholder="Size" maxLength={50} />
                    </FormField>
                    <FormField label="Values" hint="Separate values with commas." error={errors[`option.${i}.values`]}>
                      <Input value={option.values} onChange={(e) => setOption(i, { values: e.target.value })} placeholder="S, M, L" />
                    </FormField>
                    <IconButton
                      icon={Trash2}
                      label={`Remove option ${option.name || i + 1}`}
                      variant="danger"
                      className="sm:mt-7"
                      onClick={() => set({ options: form.options.filter((_, j) => j !== i) })}
                    />
                  </div>
                ))}
                {errors.options && (
                  <p role="alert" className="text-sm font-medium text-danger-600 dark:text-danger-400">
                    {errors.options}
                  </p>
                )}
                {form.options.length < PRODUCT_LIMITS.options && (
                  <Button
                    variant="ghost"
                    size="sm"
                    leftIcon={Plus}
                    onClick={() =>
                      set({
                        options: [...form.options, { name: '', values: '' }],
                      })
                    }
                  >
                    Add option
                  </Button>
                )}
              </fieldset>

              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  Variants{' '}
                  <span className="font-normal text-slate-500">
                    ({activeCount} of {rows.length} combinations)
                  </span>
                </p>
                {rows.length === 0 ? (
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Add options and values to create variants.</p>
                ) : (
                  <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                    {rows.map(({ key, row, removed }) => (
                      <VariantRow
                        key={key}
                        label={comboLabel(row.attributes)}
                        row={row}
                        errors={errors}
                        prefix={`row.${key}.`}
                        removed={removed}
                        onChange={(patch) => setRow(key, row, patch)}
                        onRemove={() => toggleRemoved(key, true)}
                        onRestore={() => toggleRemoved(key, false)}
                      />
                    ))}
                  </ul>
                )}
                {errors.variants && (
                  <p role="alert" className="text-sm font-medium text-danger-600 dark:text-danger-400">
                    {errors.variants}
                  </p>
                )}
              </div>
            </>
          )}
          {isEdit && (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Saving replaces the whole product. Variants you remove here become inactive; their order history stays.
            </p>
          )}
        </Section>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          {onCancel && (
            <Button variant="outline" onClick={onCancel} disabled={busy}>
              Cancel
            </Button>
          )}
          <Button type="submit" loading={busy}>
            {submitLabel}
          </Button>
        </div>
      </form>

      {/* Outside the <form>: ConfirmDialog has its own form, and forms cannot be nested. */}
      <ConfirmDialog
        open={confirmDrop !== null}
        title="Remove existing variants?"
        message={
          <>
            <p>These variants are not in the form any more. After saving they become inactive and customers cannot buy them:</p>
            <ul className="mt-2 list-disc pl-5">
              {(confirmDrop ?? []).map((v) => (
                <li key={v.publicId}>
                  {v.label || comboLabel(v.attributes ?? {}) || v.sku} <span className="text-slate-400">({v.sku})</span>
                </li>
              ))}
            </ul>
          </>
        }
        confirmLabel="Save anyway"
        tone="danger"
        onConfirm={async () => {
          setConfirmDrop(null)
          await save()
        }}
        onCancel={() => setConfirmDrop(null)}
      />
    </>
  )
}
