import { useMemo } from 'react'
import { useDispatch } from 'react-redux'
import { toastAdded } from '@/store/slices/uiSlice'

// const toast = useToast(); toast.success('Saved'); toast.error(error.message)
export function useToast() {
  const dispatch = useDispatch()
  return useMemo(() => {
    const show = (type) => (message, title) => dispatch(toastAdded({ type, title, message }))
    return { success: show('success'), error: show('error'), info: show('info'), warning: show('warning') }
  }, [dispatch])
}
