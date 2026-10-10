import { useCallback } from 'react'
import { useSelector } from 'react-redux'
import { useLocation, useNavigate } from 'react-router-dom'
import { selectStatusReason } from '@/store/slices/authSlice'
import { usePermissions } from './usePermissions'

/**
 * Who is trying to shop, for "Add to cart" / "Buy" / "Checkout" / "Pay" buttons.
 * mode:
 *  - 'guest'       -> send to /login?next=<current page>
 *  - 'nonCustomer' -> show "Shopping is available to customer accounts"
 *  - 'banned'      -> disable with a tooltip showing the ban reason
 *  - 'customer'    -> allowed
 */
export function useShopper() {
  const { isAuthenticated, isCustomer, canActAsCustomer } = usePermissions()
  const statusReason = useSelector(selectStatusReason)
  const navigate = useNavigate()
  const location = useLocation()

  let mode = 'customer'
  if (!isAuthenticated) mode = 'guest'
  else if (!isCustomer) mode = 'nonCustomer'
  else if (!canActAsCustomer) mode = 'banned'

  const goToLogin = useCallback(() => {
    navigate(`/login?next=${encodeURIComponent(location.pathname + location.search)}`)
  }, [navigate, location.pathname, location.search])

  const bannedReason = `Your account is banned${statusReason ? `: ${statusReason}` : '.'}`

  return { mode, goToLogin, bannedReason }
}
