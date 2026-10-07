import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { RouterProvider } from 'react-router-dom'
import { configureApiClient } from '@/api/client'
import { readSession, writeSession } from '@/api/session'
import { store } from '@/app/store'
import { router } from '@/app/router'
import { passwordChangeRequired, sessionExpired, sessionUpdated } from '@/store/slices/authSlice'
import './index.css'

// Connect the API client to Redux and the router (the client itself imports neither).
configureApiClient({
  onSessionChanged: (session) => store.dispatch(sessionUpdated(session)),

  onSessionExpired: () => {
    store.dispatch(sessionExpired())
    const { pathname, search } = router.state.location
    if (pathname !== '/login') {
      router.navigate(`/login?expired=1&next=${encodeURIComponent(pathname + search)}`, { replace: true })
    }
  },

  onPasswordChangeRequired: () => {
    const session = readSession()
    if (session) writeSession({ ...session, mustChangePassword: true })
    store.dispatch(passwordChangeRequired())
    if (router.state.location.pathname !== '/change-password') router.navigate('/change-password', { replace: true })
  },
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Provider store={store}>
      <RouterProvider router={router} />
    </Provider>
  </StrictMode>,
)
