// Status gating for the seller center (contract section 4).
// A merchant in the silent ban grace period is reported as ACTIVE: never guess or hint at it.
import { USER_STATUS } from '@/config/permissions'
import { usePermissions } from './usePermissions'

export function useMerchantStatus() {
  const { status, isOwner, isMerchantSide } = usePermissions()
  const isBanned = isMerchantSide && status === USER_STATUS.BANNED
  return {
    isPending: isOwner && status === USER_STATUS.PENDING_APPROVAL,
    isRejected: isOwner && status === USER_STATUS.REJECTED,
    isBanned,
    // BANNED is history only: every create, edit, status change and action is hidden.
    readOnly: isBanned,
  }
}
