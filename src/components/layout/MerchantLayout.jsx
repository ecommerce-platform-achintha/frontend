import { useMemo } from 'react'
import { filterNav, MERCHANT_NAV } from '@/config/navigation'
import { landingPathFor } from '@/config/permissions'
import { usePermissions } from '@/hooks/usePermissions'
import DashboardShell from './DashboardShell'

// Seller center. The sidebar shows only what this merchant/assistant may open
// (owner-only items are hidden from assistants).
export default function MerchantLayout() {
  const { can, user, isOwner } = usePermissions()
  const groups = useMemo(() => filterNav(MERCHANT_NAV, can), [can])
  return <DashboardShell groups={groups} subtitle={isOwner ? 'Seller center' : 'Seller center · Assistant'} homePath={landingPathFor(user)} />
}
