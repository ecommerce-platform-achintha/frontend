import { useCallback, useState } from 'react'
import { useNow } from './useNow'

// For 429 responses: start(error.retryAfter) and read `secondsLeft` / `isWaiting`.
export function useRetryAfter() {
  const [until, setUntil] = useState(0)
  const now = useNow(1000, until > 0)
  const secondsLeft = until > now ? Math.ceil((until - now) / 1000) : 0

  const start = useCallback((seconds) => {
    // No header: wait a short default so users do not hammer the button.
    const s = Number.isFinite(seconds) && seconds > 0 ? seconds : 30
    setUntil(Date.now() + s * 1000)
  }, [])

  return { secondsLeft, isWaiting: secondsLeft > 0, start }
}
