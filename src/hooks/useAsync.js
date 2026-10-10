import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Loads data for one screen element (a product, a store, the home rows) without Redux.
 * Use Redux slices for data several screens share; use this for page-local reads.
 *
 * const { data, error, status, reload } = useAsync(() => api.getThing(id), id)
 *   - `key` (string/number) re-runs the loader when it changes; pass null to skip loading.
 *   - status: 'loading' | 'succeeded' | 'failed' | 'idle'
 * Responses from an older key are ignored (no race when the user navigates quickly).
 */
export function useAsync(loader, key) {
  const loaderRef = useRef(loader)
  useEffect(() => {
    loaderRef.current = loader
  })

  const [state, setState] = useState({ data: null, error: null, status: key == null ? 'idle' : 'loading' })
  const [nonce, setNonce] = useState(0)
  const reload = useCallback(() => setNonce((n) => n + 1), [])
  // Silent replace (e.g. after a mutation returned the fresh object).
  const setData = useCallback((data) => setState({ data, error: null, status: 'succeeded' }), [])

  // Reset to "loading" synchronously when the key changes (avoids showing stale data).
  const [lastKey, setLastKey] = useState(key)
  if (lastKey !== key) {
    setLastKey(key)
    setState({ data: null, error: null, status: key == null ? 'idle' : 'loading' })
  }

  useEffect(() => {
    if (key == null) return undefined
    let active = true
    setState((s) => (s.status === 'loading' ? s : { ...s, status: 'loading', error: null }))
    loaderRef
      .current()
      .then((data) => active && setState({ data, error: null, status: 'succeeded' }))
      .catch((error) => active && setState({ data: null, error, status: 'failed' }))
    return () => {
      active = false
    }
  }, [key, nonce])

  return { ...state, reload, setData, isLoading: state.status === 'loading' }
}
