import { useMemo } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { filterNav, MERCHANT_NAV } from '@/config/navigation'
import { landingPathFor } from '@/config/permissions'
import { useMerchantStatus } from '@/hooks/useMerchantStatus'
import { usePermissions } from '@/hooks/usePermissions'
import DashboardShell from './DashboardShell'

const APPLICATION_PATH = '/merchant/application'

// Seller center. The sidebar shows only what this merchant/assistant may open
// (owner-only items are hidden from assistants).
// A REJECTED merchant can only use the application page until it is approved.
export default function MerchantLayout() {
  const { can, user, isOwner } = usePermissions()
  const { isRejected } = useMerchantStatus()
  const location = useLocation()

  const groups = useMemo(() => {
    const visible = filterNav(MERCHANT_NAV, can)
    if (!isRejected) return visible
    return visible
      .map((group) => ({ ...group, items: group.items.filter((item) => item.to === APPLICATION_PATH) }))
      .filter((group) => group.items.length > 0)
  }, [can, isRejected])

  if (isRejected && location.pathname !== APPLICATION_PATH) return <Navigate to={APPLICATION_PATH} replace />

  return <DashboardShell groups={groups} subtitle={isOwner ? 'Seller center' : 'Seller center · Assistant'} homePath={landingPathFor(user)} />
}
