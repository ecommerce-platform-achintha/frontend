import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'

/**
 * Filters, sort and page kept in the URL query string, so refresh and the back button work.
 *
 * `defaults` must be a module-level constant: { q: '', page: 0, size: 24, status: [] }.
 * Numbers are parsed as numbers, arrays read repeated params (status=A&status=B).
 * Values equal to their default are left out of the URL.
 *
 * const [query, setQuery] = useUrlQuery(DEFAULTS)
 * setQuery({ q: 'shoes' })           // resets page to 0
 * setQuery({ page: 2 }, { resetPage: false })
 */
export function useUrlQuery(defaults) {
  const [params, setParams] = useSearchParams()

  const query = useMemo(() => {
    const result = { ...defaults }
    for (const [key, fallback] of Object.entries(defaults)) {
      if (Array.isArray(fallback)) {
        const values = params.getAll(key)
        if (values.length) result[key] = values
      } else if (params.has(key)) {
        const raw = params.get(key)
        result[key] = typeof fallback === 'number' ? (Number.isFinite(Number(raw)) ? Number(raw) : fallback) : raw
      }
    }
    return result
  }, [params, defaults])

  const setQuery = useCallback(
    (patch, { resetPage = true, replace = false } = {}) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          for (const [key, value] of Object.entries(patch)) {
            next.delete(key)
            const isDefault = JSON.stringify(value) === JSON.stringify(defaults[key])
            if (value === undefined || value === null || value === '' || isDefault) continue
            if (Array.isArray(value)) value.forEach((v) => next.append(key, v))
            else next.set(key, String(value))
          }
          if (resetPage && !('page' in patch)) next.delete('page')
          return next
        },
        { replace },
      )
    },
    [setParams, defaults],
  )

  return [query, setQuery]
}
