import { useCallback } from 'react'
import { useDispatch } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { logout } from '@/store/slices/authSlice'
import { useToast } from './useToast'

// Signs out (server + local), then goes to the login page.
export function useSignOut() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const toast = useToast()
  return useCallback(async () => {
    await dispatch(logout())
    navigate('/login', { replace: true })
    toast.success('You are signed out.')
  }, [dispatch, navigate, toast])
}
