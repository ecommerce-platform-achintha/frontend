import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { selectAccessUser, selectIsAuthenticated, selectMustChangePassword } from '@/store/slices/authSlice'
import { canAccess } from '@/config/permissions'

/**
 * Guards a group of routes (renders <Outlet />) or a single element (children).
 * - not signed in          -> /login?next=<current url>
 * - must change password   -> /change-password
 * - wrong role/permission  -> /403
 * Props: roles, perms (all needed), anyPerms (one needed). Usually spread a ROUTE_ACCESS entry.
 */
export default function ProtectedRoute({ roles, perms, anyPerms, children }) {
  const location = useLocation()
  const isAuthenticated = useSelector(selectIsAuthenticated)
  const mustChangePassword = useSelector(selectMustChangePassword)
  const user = useSelector(selectAccessUser)

  if (!isAuthenticated) {
    const next = encodeURIComponent(location.pathname + location.search)
    return <Navigate to={`/login?next=${next}`} replace />
  }
  if (mustChangePassword) return <Navigate to="/change-password" replace />
  if (!canAccess(user, { roles, perms, anyPerms })) {
    return <Navigate to="/403" replace state={{ from: location.pathname }} />
  }
  return children ?? <Outlet />
}
