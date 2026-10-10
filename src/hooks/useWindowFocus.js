import { useEffect, useRef } from 'react'

// Calls `callback` when the tab becomes visible/focused again (used to refresh order details).
export function useWindowFocus(callback, enabled = true) {
  const ref = useRef(callback)
  useEffect(() => {
    ref.current = callback
  })
  useEffect(() => {
    if (!enabled) return undefined
    let last = 0
    const onFocus = () => {
      // "focus" and "visibilitychange" often fire together: run once per 2 s.
      if (document.visibilityState !== 'visible' || Date.now() - last < 2000) return
      last = Date.now()
      ref.current()
    }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onFocus)
    return () => {
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onFocus)
    }
  }, [enabled])
}
