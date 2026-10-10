import { useMerchantStatus } from '@/hooks/useMerchantStatus'
import { usePermissions } from '@/hooks/usePermissions'
import { PERM_LABELS } from '@/config/permissions'
import Button from '@/components/ui/Button'
import Tooltip from '@/components/ui/Tooltip'

/**
 * A Button that checks permissions first.
 * - mode="hide" (default): renders nothing when not allowed.
 * - mode="disable": renders a disabled button with a tooltip explaining why.
 * Extra `blockedReason` disables it for a business reason (e.g. "Awaiting approval").
 * A BANNED merchant is history only, so every PermissionButton is hidden for it.
 *
 * <PermissionButton perms={ACTION_ACCESS.shipOrder} mode="disable" onClick={...}>Ship</PermissionButton>
 */
export default function PermissionButton({ roles, perms, anyPerms, mode = 'hide', blockedReason, disabled, children, ...props }) {
  const { can } = usePermissions()
  const { readOnly } = useMerchantStatus()
  const allowed = can({ roles, perms, anyPerms })

  if (readOnly) return null
  if (!allowed && mode === 'hide') return null

  let reason = blockedReason
  if (!allowed) {
    const needed = [...(perms ?? []), ...(anyPerms ?? [])].map((p) => PERM_LABELS[p] ?? p)
    reason = needed.length
      ? `You need the "${needed.join(anyPerms?.length ? '" or "' : '" and "')}" permission.`
      : 'Your account cannot do this.'
  }

  if (reason) {
    return (
      <Tooltip content={reason}>
        <Button {...props} disabled aria-label={typeof children === 'string' ? `${children} (not available)` : undefined}>
          {children}
        </Button>
      </Tooltip>
    )
  }
  return (
    <Button disabled={disabled} {...props}>
      {children}
    </Button>
  )
}
