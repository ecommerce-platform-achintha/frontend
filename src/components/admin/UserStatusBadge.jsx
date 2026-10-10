import { Info } from 'lucide-react'
import * as adminApi from '@/api/admin'
import { BAN_GRACE_LABEL, BAN_GRACE_SETTING } from '@/config/admin'
import { useAsync } from '@/hooks/useAsync'
import { usePermissions } from '@/hooks/usePermissions'
import StatusBadge from '@/components/ui/StatusBadge'
import Tooltip from '@/components/ui/Tooltip'
import { settingsCache } from './settingsCache'

// One settings read per page load, shared by every badge on screen
// (the settings page clears it after a change).
const loadSettingsOnce = () => settingsCache.load(adminApi.listSettings)

// Only the super admin can read settings; for plain admins no number of days is stated.
function useBanGraceDays(enabled) {
  const { isSuperAdmin } = usePermissions()
  const { data } = useAsync(loadSettingsOnce, enabled && isSuperAdmin ? 'settings:ban-grace' : null)
  const setting = Array.isArray(data) ? data.find((s) => s.key === BAN_GRACE_SETTING) : null
  return setting?.value ?? null
}

/**
 * The REAL account status (admin screens). BAN_GRACE is a merchant whose ban is decided but who
 * still sees ACTIVE; the tooltip explains it.
 */
export default function UserStatusBadge({ status }) {
  const isGrace = status === 'BAN_GRACE'
  const days = useBanGraceDays(isGrace)
  if (!isGrace) return <StatusBadge value={status} type="UserStatus" />
  const period = days ? `${days} days` : 'a grace period'
  return (
    <Tooltip
      content={`The ban is decided, but for ${period} the merchant still sees an active account and is not told. When it ends, the ban takes effect. Unban to cancel it.`}
    >
      <span className="inline-flex items-center gap-1" tabIndex={0}>
        <StatusBadge value={status} type="UserStatus" label={BAN_GRACE_LABEL} />
        <Info aria-hidden="true" className="size-3.5 text-slate-400" />
      </span>
    </Tooltip>
  )
}
