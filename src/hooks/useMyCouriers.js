import * as storesApi from '@/api/stores'
import { useAsync } from './useAsync'
import { usePermissions } from './usePermissions'

/**
 * The store's enabled couriers (GET /api/merchant/owner/couriers, OWNER ONLY).
 * Assistants cannot call it: `couriers` is null for them and forms fall back to a typed code.
 */
export function useMyCouriers() {
  const { isOwner } = usePermissions()
  const { data, status, error, reload } = useAsync(() => storesApi.listMyCouriers(), isOwner ? 'my-couriers' : null)
  return {
    couriers: isOwner ? (Array.isArray(data) ? data : []) : null,
    loading: isOwner && status === 'loading',
    error,
    reload,
  }
}
