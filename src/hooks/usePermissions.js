// Everything components need to know about "who is this user and what can they do".
import { useCallback, useMemo } from 'react'
import { useSelector } from 'react-redux'
import { selectAccessUser, selectIsAuthenticated } from '@/store/slices/authSlice'
import { canAccess, ROLES, USER_STATUS, userHasPerm } from '@/config/permissions'

export function usePermissions() {
  const user = useSelector(selectAccessUser)
  const isAuthenticated = useSelector(selectIsAuthenticated)
  const { role, status } = user

  const hasRole = useCallback((...roles) => roles.flat().includes(role), [role])
  // The merchant (owner) holds every assistant permission implicitly.
  const hasPerm = useCallback((perm) => userHasPerm(user, perm), [user])
  const hasAllPerms = useCallback((perms = []) => perms.every((p) => userHasPerm(user, p)), [user])
  const hasAnyPerm = useCallback((perms = []) => perms.some((p) => userHasPerm(user, p)), [user])
  // rule = { roles, perms, anyPerms } (see ROUTE_ACCESS)
  const can = useCallback((rule) => isAuthenticated && canAccess(user, rule), [isAuthenticated, user])

  return useMemo(
    () => ({
      user,
      role,
      status,
      isAuthenticated,
      hasRole,
      hasPerm,
      hasAllPerms,
      hasAnyPerm,
      can,
      isCustomer: role === ROLES.CUSTOMER,
      isOwner: role === ROLES.MERCHANT,
      isAssistant: role === ROLES.ASSISTANT,
      isMerchantSide: role === ROLES.MERCHANT || role === ROLES.ASSISTANT,
      isAdmin: role === ROLES.ADMIN || role === ROLES.SUPER_ADMIN, // super admin has all admin powers
      isSuperAdmin: role === ROLES.SUPER_ADMIN,
      isBanned: status === USER_STATUS.BANNED,
      // A banned customer can browse and see history, but not check out, confirm quotes or pay.
      canActAsCustomer: role === ROLES.CUSTOMER && status !== USER_STATUS.BANNED,
    }),
    [user, role, status, isAuthenticated, hasRole, hasPerm, hasAllPerms, hasAnyPerm, can],
  )
}
