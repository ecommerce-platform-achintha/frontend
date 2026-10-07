import { useEffect } from 'react'
import { Outlet, ScrollRestoration } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { SESSION_KEY, readSession } from '@/api/session'
import { THEME_STORAGE_KEY } from '@/config/constants'
import {
  bootstrapAuth,
  fetchProfile,
  selectBootStatus,
  selectUserPublicId,
  sessionExpired,
  sessionUpdated,
} from '@/store/slices/authSlice'
import { applyThemeClass, bannerDismissed, bannerShown, selectTheme, themeSet } from '@/store/slices/uiSlice'
import SplashScreen from '@/components/common/SplashScreen'
import Toaster from '@/components/ui/Toast'

// Keeps this tab in sync when another tab refreshes tokens, signs in/out or changes the theme.
function useCrossTabSync() {
  const dispatch = useDispatch()
  const publicId = useSelector(selectUserPublicId)

  useEffect(() => {
    const onStorage = (event) => {
      if (event.key === SESSION_KEY) {
        const session = readSession()
        if (!session) {
          dispatch(sessionExpired())
          return
        }
        dispatch(sessionUpdated(session))
        // A different account signed in elsewhere: load its profile.
        if (session.publicId && session.publicId !== publicId) dispatch(fetchProfile())
      }
      if (event.key === THEME_STORAGE_KEY && event.newValue) dispatch(themeSet(event.newValue))
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [dispatch, publicId])
}

// Shows a banner while the browser is offline.
function useOfflineBanner() {
  const dispatch = useDispatch()
  useEffect(() => {
    const offline = () => dispatch(bannerShown({ id: 'offline', type: 'warning', message: 'You are offline. Changes will not be saved until you reconnect.' }))
    const online = () => dispatch(bannerDismissed('offline'))
    window.addEventListener('offline', offline)
    window.addEventListener('online', online)
    return () => {
      window.removeEventListener('offline', offline)
      window.removeEventListener('online', online)
    }
  }, [dispatch])
}

// Root route element: restores the session before any page renders.
export default function AppRoot() {
  const dispatch = useDispatch()
  const bootStatus = useSelector(selectBootStatus)
  const theme = useSelector(selectTheme)

  useEffect(() => {
    dispatch(bootstrapAuth())
  }, [dispatch])

  useEffect(() => {
    applyThemeClass(theme)
  }, [theme])

  useCrossTabSync()
  useOfflineBanner()

  if (bootStatus !== 'ready') return <SplashScreen />

  return (
    <>
      <ScrollRestoration />
      <Outlet />
      <Toaster />
    </>
  )
}
