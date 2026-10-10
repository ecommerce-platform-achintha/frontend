import { useMemo } from 'react'
import { useDispatch } from 'react-redux'
import { toastAdded } from '@/store/slices/uiSlice'
import { errorMessage } from '@/config/errorMessages'

// const toast = useToast(); toast.success('Saved'); toast.error(error.message)
// API errors: toast.apiError(error)
// With a link: toast.success('Added to cart', undefined, { action: { label: 'View cart', to: '/cart' } })
export function useToast() {
  const dispatch = useDispatch()
  return useMemo(() => {
    const show = (type) => (message, title, options) => dispatch(toastAdded({ type, title, message, action: options?.action }))
    const error = show('error')
    // An API error as a toast; STORE_PROFILE_REQUIRED links to the store profile form.
    const apiError = (err, fallback) =>
      error(
        errorMessage(err, fallback),
        undefined,
        err?.code === 'STORE_PROFILE_REQUIRED' ? { action: { label: 'Set up store', to: '/merchant/store' } } : undefined,
      )
    return { success: show('success'), error, info: show('info'), warning: show('warning'), apiError }
  }, [dispatch])
}
