import { useEffect, useState } from 'react'

// Current time in ms, updated every `intervalMs`. Countdowns compute from this each tick,
// so they never drift (we do not subtract 1 second per tick).
export function useNow(intervalMs = 1000, enabled = true) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!enabled) return undefined
    // Align ticks to the next full second so all countdowns change together.
    let intervalId
    const timeoutId = setTimeout(() => {
      setNow(Date.now())
      intervalId = setInterval(() => setNow(Date.now()), intervalMs)
    }, intervalMs - (Date.now() % intervalMs))
    return () => {
      clearTimeout(timeoutId)
      clearInterval(intervalId)
    }
  }, [intervalMs, enabled])
  return now
}
