import { useCallback, useState } from 'react'
import { errorMessage } from '@/config/errorMessages'
import { useToast } from './useToast'

/**
 * State for one confirm/decision dialog at a time: which action on which item, and its error.
 *
 * const dialog = useActionDialog()
 * dialog.open('ban', user)                      // dialog.action === 'ban', dialog.target === user
 * onConfirm={dialog.run((reason) => api.ban(id, reason), 'Banned.', reload)}
 * `run` shows the success toast, closes, calls `after`; on error it keeps the dialog open with the message
 * (and still calls `onError(err)` so the page can refetch, e.g. on INVALID_STATUS_TRANSITION).
 */
export function useActionDialog() {
  const toast = useToast()
  const [state, setState] = useState({ action: null, target: null, error: '' })

  const open = useCallback((action, target = null) => setState({ action, target, error: '' }), [])
  const close = useCallback(() => setState({ action: null, target: null, error: '' }), [])

  const run = useCallback(
    (call, successMessage, after, onError) =>
      async (...args) => {
        setState((s) => ({ ...s, error: '' }))
        try {
          const result = await call(...args)
          if (successMessage) toast.success(successMessage)
          close()
          after?.(result)
          return result
        } catch (err) {
          setState((s) => ({ ...s, error: errorMessage(err) }))
          onError?.(err)
          throw err
        }
      },
    [toast, close],
  )

  return { ...state, isOpen: (action) => state.action === action, open, close, run }
}
