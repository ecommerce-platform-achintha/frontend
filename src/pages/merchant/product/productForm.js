// Product form logic (no React): variant matrix, validation and the request body (contract 7.3).
import { PRODUCT_LIMITS } from '@/config/merchant'
import { compactErrors, REGEX, validateMoney } from '@/utils/validators'

// "Red, Blue ,red" -> ["Red", "Blue"] (trimmed, empty and duplicate values dropped, case-insensitive).
export function parseValues(text) {
  const seen = new Set()
  return String(text ?? '')
    .split(',')
    .map((v) => v.trim())
    .filter((v) => {
      const k = v.toLowerCase()
      if (!v || seen.has(k)) return false
      seen.add(k)
      return true
    })
}

// Options with a name and at least one value, in order.
export function usableOptions(options) {
  return options.map((o) => ({ name: o.name.trim(), values: parseValues(o.values) })).filter((o) => o.name && o.values.length)
}

// Cartesian product: [{Color:Red,Size:M}, {Color:Red,Size:L}, ...]
export function combinations(options) {
  return options.reduce((acc, o) => acc.flatMap((combo) => o.values.map((v) => ({ ...combo, [o.name]: v }))), [{}])
}

// Stable key for a combination in option order ("Color=Red|Size=M"); case-insensitive values.
export function comboKey(attributes, optionNames) {
  return optionNames.map((n) => `${n}=${String(attributes?.[n] ?? '').toLowerCase()}`).join('|')
}

const emptyRow = (attributes) => ({ publicId: null, attributes, sku: '', listPrice: '', status: 'ACTIVE', initialStock: '0', imageKeys: [] })

export const EMPTY_PRODUCT_FORM = {
  name: '',
  description: '',
  categorySlug: '',
  codAllowed: true,
  imageKeys: [],
  mode: 'simple', // simple | options
  simple: emptyRow({}),
  options: [{ name: '', values: '' }],
  rows: {}, // comboKey -> row data (kept while options change, so typed values are not lost)
  removed: [], // comboKeys the user removed from the matrix
}

const variantToRow = (v) => ({
  publicId: v.publicId,
  attributes: v.attributes ?? {},
  sku: v.sku ?? '',
  listPrice: v.listPrice != null ? String(v.listPrice) : '',
  status: v.status ?? 'ACTIVE',
  initialStock: '',
  imageKeys: v.imageKeys ?? [],
})

// Server product aggregate -> form state.
export function productToForm(product) {
  const options = (product.options ?? []).map((o) => ({ name: o.name, values: (o.values ?? []).join(', ') }))
  const variants = product.variants ?? []
  const base = {
    ...EMPTY_PRODUCT_FORM,
    name: product.name ?? '',
    description: product.description ?? '',
    categorySlug: product.categorySlug ?? product.category?.slug ?? (typeof product.category === 'string' ? product.category : ''),
    codAllowed: product.codAllowed !== false,
    imageKeys: product.imageKeys ?? [],
  }
  if (!options.length) {
    return { ...base, mode: 'simple', simple: variants[0] ? variantToRow(variants[0]) : emptyRow({}) }
  }
  const names = options.map((o) => o.name)
  const rows = Object.fromEntries(variants.map((v) => [comboKey(v.attributes, names), variantToRow(v)]))
  return { ...base, mode: 'options', options, rows }
}

/**
 * The rows the matrix shows now: one per combination, filled from `form.rows` when known.
 * @returns {{ key, row, removed }[]}
 */
export function matrixRows(form) {
  const options = usableOptions(form.options)
  if (!options.length) return []
  const names = options.map((o) => o.name)
  return combinations(options).map((attributes) => {
    const key = comboKey(attributes, names)
    const known = form.rows[key]
    return { key, row: known ? { ...known, attributes } : emptyRow(attributes), removed: form.removed.includes(key) }
  })
}

/**
 * Existing variants (from the server) that this save leaves out. On PUT they become INACTIVE.
 * @param product the last server copy (null when creating)
 */
export function droppedVariants(form, product) {
  const existing = product?.variants ?? []
  if (!existing.length) return []
  const kept = new Set(
    form.mode === 'simple'
      ? [form.simple.publicId].filter(Boolean)
      : matrixRows(form)
          .filter((r) => !r.removed && r.row.publicId)
          .map((r) => r.row.publicId),
  )
  return existing.filter((v) => !kept.has(v.publicId) && v.status !== 'INACTIVE')
}

function validateRow(row, isNew) {
  const errors = {}
  const sku = row.sku.trim()
  if (!sku) errors.sku = 'SKU is required.'
  else if (!REGEX.sku.test(sku)) errors.sku = 'Letters, digits and . _ / - only (up to 64, starting with a letter or digit).'
  const price = validateMoney(row.listPrice)
  if (price) errors.listPrice = price
  else if (Number(row.listPrice) < 0.01) errors.listPrice = 'Price must be at least 0.01.'
  if (isNew) {
    const stock = String(row.initialStock).trim()
    if (stock === '' || !/^\d+$/.test(stock)) errors.initialStock = 'Enter 0 or more.'
  }
  return errors
}

/**
 * Validates the whole form. Errors are keyed like the UI fields:
 * name, description, categorySlug, sku/listPrice/initialStock (simple),
 * option.<i>.name, option.<i>.values, options, row.<key>.<field>, variants.
 */
export function validateProductForm(form) {
  const errors = {}
  if (!form.name.trim()) errors.name = 'Name is required.'
  if (form.description.length > PRODUCT_LIMITS.description) errors.description = `Keep it under ${PRODUCT_LIMITS.description} characters.`
  if (!form.categorySlug) errors.categorySlug = 'Choose a category.'

  if (form.mode === 'simple') {
    const rowErrors = validateRow(form.simple, !form.simple.publicId)
    return compactErrors({ ...errors, ...rowErrors })
  }

  const names = new Set()
  form.options.forEach((o, i) => {
    const name = o.name.trim()
    if (!name) errors[`option.${i}.name`] = 'Name the option, for example Size.'
    else if (names.has(name.toLowerCase())) errors[`option.${i}.name`] = 'Each option needs a different name.'
    names.add(name.toLowerCase())
    if (!parseValues(o.values).length) errors[`option.${i}.values`] = 'Add at least one value.'
  })
  if (!form.options.length) errors.options = 'Add at least one option, or switch to a simple product.'
  if (form.options.length > PRODUCT_LIMITS.options) errors.options = `Up to ${PRODUCT_LIMITS.options} options.`

  const rows = matrixRows(form).filter((r) => !r.removed)
  if (!rows.length && !errors.options) errors.variants = 'Keep at least one combination.'
  if (rows.length > PRODUCT_LIMITS.variants) errors.variants = `Up to ${PRODUCT_LIMITS.variants} variants. Remove some values or combinations.`

  const skus = new Map()
  for (const { key, row } of rows) {
    const rowErrors = validateRow(row, !row.publicId)
    const sku = row.sku.trim().toLowerCase()
    if (sku && !rowErrors.sku) {
      if (skus.has(sku)) rowErrors.sku = 'Each variant needs its own SKU.'
      skus.set(sku, key)
    }
    for (const [field, message] of Object.entries(rowErrors)) errors[`row.${key}.${field}`] = message
  }
  return compactErrors(errors)
}

const money = (v) => Number(v)

/**
 * Request body for POST (create) or PUT (edit; replaces the whole aggregate).
 * Returns { body, rowKeys } where rowKeys[i] is the matrix key of body.variants[i]
 * (used to put server fieldErrors like "variants[2].sku" on the right row).
 */
export function productFormToBody(form, { isEdit }) {
  const body = {
    name: form.name.trim(),
    categorySlug: form.categorySlug,
    codAllowed: form.codAllowed,
    imageKeys: form.imageKeys,
  }
  const description = form.description.trim()
  if (description) body.description = description

  if (form.mode === 'simple') {
    const s = form.simple
    if (!isEdit) {
      // A new simple product sends sku + listPrice + initialStock instead of variants.
      Object.assign(body, { sku: s.sku.trim(), listPrice: money(s.listPrice), initialStock: Number(s.initialStock) })
      return { body, rowKeys: [] }
    }
    // Edit: the PUT replaces the aggregate, so the one variant is sent with its publicId
    // (if it were left out it would become INACTIVE). initialStock only for a new variant.
    const variant = { sku: s.sku.trim(), attributes: {}, listPrice: money(s.listPrice), status: s.status, imageKeys: s.imageKeys }
    if (s.publicId) variant.publicId = s.publicId
    else variant.initialStock = Number(s.initialStock)
    Object.assign(body, { options: [], variants: [variant] })
    return { body, rowKeys: ['simple'] }
  }

  const rows = matrixRows(form).filter((r) => !r.removed)
  body.options = usableOptions(form.options)
  body.variants = rows.map(({ row }) => {
    const variant = { sku: row.sku.trim(), attributes: row.attributes, listPrice: money(row.listPrice), status: row.status, imageKeys: row.imageKeys }
    if (row.publicId) variant.publicId = row.publicId
    else variant.initialStock = Number(row.initialStock) // never sent for existing variants
    return variant
  })
  return { body, rowKeys: rows.map((r) => r.key) }
}

/**
 * Server fieldErrors -> form error keys. "variants[2].sku" -> "row.<key>.sku"; simple-product
 * fields keep their names.
 */
export function mapServerFieldErrors(fieldErrors, rowKeys, mode) {
  const mapped = {}
  for (const [field, message] of Object.entries(fieldErrors)) {
    const m = /^variants\[(\d+)\]\.(\w+)/.exec(field)
    if (m) {
      const key = rowKeys[Number(m[1])]
      if (key === 'simple' || mode === 'simple') mapped[m[2]] = message
      else if (key) mapped[`row.${key}.${m[2]}`] = message
      else mapped.variants = message
    } else {
      mapped[field] = message
    }
  }
  return mapped
}

// SKU_TAKEN may come without fieldErrors: point at the row whose SKU the message names.
export function skuTakenField(form, message) {
  const text = String(message ?? '')
  if (form.mode === 'simple') return 'sku'
  const hit = matrixRows(form).find(({ row }) => row.sku.trim() && text.includes(row.sku.trim()))
  return hit ? `row.${hit.key}.sku` : 'variants'
}
