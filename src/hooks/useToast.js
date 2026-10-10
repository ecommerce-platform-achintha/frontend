import { useMemo } from 'react'
import { useDispatch } from 'react-redux'
import { toastAdded } from '@/store/slices/uiSlice'

// const toast = useToast(); toast.success('Saved'); toast.error(error.message)
// With a link: toast.success('Added to cart', undefined, { action: { label: 'View cart', to: '/cart' } })
export function useToast() {
  const dispatch = useDispatch()
  return useMemo(() => {
    const show = (type) => (message, title, options) => dispatch(toastAdded({ type, title, message, action: options?.action }))
    return { success: show('success'), error: show('error'), info: show('info'), warning: show('warning') }
  }, [dispatch])
}
