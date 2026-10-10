import { useCallback, useRef } from 'react'
import { newIdempotencyKey } from '@/api/client'

/**
 * Idempotency-Key rules for checkout and payment submission (contract section 2):
 * - one key per user intent: created the first time the user submits a given payload;
 * - the SAME key is reused while the user retries the same payload after a failure with no
 *   definitive answer (network error, timeout, 5xx, or "still in progress"), so a retry cannot
 *   create a second order/payment;
 * - a NEW key is used when the payload changes, and after any definitive response (2xx or 4xx).
 *   Assumed backend behaviour: a 422 is stored and replayed for the same key, so keeping the key
 *   after a 422 would block a corrected retry. That is why we drop it after 4xx too.
 *
 * const idem = useIdempotencyKey()
 * const key = idem.keyFor(payload)   // before the request
 * idem.settle(error)                 // after it: pass the error, or nothing on success
 */
export function useIdempotencyKey() {
  const current = useRef({ key: null, signature: null })

  const keyFor = useCallback((payload) => {
    const signature = JSON.stringify(payload)
    if (!current.current.key || current.current.signature !== signature) {
      current.current = { key: newIdempotencyKey(), signature }
    }
    return current.current.key
  }, [])

  const settle = useCallback((error) => {
    const noDefinitiveAnswer =
      error && (error.status === 0 || error.status >= 500 || error.code === 'IDEMPOTENCY_REQUEST_IN_PROGRESS')
    if (!noDefinitiveAnswer) current.current = { key: null, signature: null }
  }, [])

  return { keyFor, settle }
}
