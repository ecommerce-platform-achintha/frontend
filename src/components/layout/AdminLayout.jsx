import { useMemo } from 'react'
import { ADMIN_NAV, filterNav } from '@/config/navigation'
import { usePermissions } from '@/hooks/usePermissions'
import DashboardShell from './DashboardShell'

// Admin console. Super-admin items appear only for the super admin.
export default function AdminLayout() {
  const { can, isSuperAdmin } = usePermissions()
  const groups = useMemo(() => filterNav(ADMIN_NAV, can), [can])
  return <DashboardShell groups={groups} subtitle={isSuperAdmin ? 'Super admin' : 'Admin console'} homePath="/admin" />
}
