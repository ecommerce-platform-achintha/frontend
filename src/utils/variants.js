// Variant picker logic for the product page (pure functions, easy to test).
//
// product.options:  [{ name: 'Size', values: ['S', 'M'] }, { name: 'Colour', values: ['Red'] }]
// product.variants: [{ publicId, attributes: { Size: 'S', Colour: 'Red' }, inStock, ... }]
//
// Options are treated as a cascade: a value of option N is enabled when some in-stock variant
// matches it AND the values already chosen for options 0..N-1. Picking an earlier option then
// fixes later options to a valid choice, so the customer can never get stuck.

const matches = (variant, selection, optionNames) => optionNames.every((name) => variant.attributes?.[name] === selection[name])

// The variant for the current selection (products without options have exactly one variant).
export function findVariant(product, selection) {
  const options = product?.options ?? []
  const variants = product?.variants ?? []
  if (options.length === 0) return variants[0] ?? null
  return variants.find((v) => matches(v, selection, options.map((o) => o.name))) ?? null
}

export function isValueAvailable(product, selection, optionName, value) {
  const options = product?.options ?? []
  const index = options.findIndex((o) => o.name === optionName)
  const before = options.slice(0, index).map((o) => o.name)
  return (product?.variants ?? []).some(
    (v) => v.inStock && v.attributes?.[optionName] === value && matches(v, selection, before),
  )
}

// After changing option `optionName`, later options keep their value if still available,
// otherwise move to the first available value.
export function pickValue(product, selection, optionName, value) {
  const options = product?.options ?? []
  const next = { ...selection, [optionName]: value }
  const index = options.findIndex((o) => o.name === optionName)
  for (const option of options.slice(index + 1)) {
    if (!isValueAvailable(product, next, option.name, next[option.name])) {
      const firstAvailable = option.values.find((v) => isValueAvailable(product, next, option.name, v))
      if (firstAvailable !== undefined) next[option.name] = firstAvailable
    }
  }
  return next
}

// Starts on the first in-stock variant (or the first variant when everything is out of stock).
export function initialSelection(product) {
  const variants = product?.variants ?? []
  const preferred = variants.find((v) => v.inStock) ?? variants[0]
  return preferred ? { ...preferred.attributes } : {}
}
