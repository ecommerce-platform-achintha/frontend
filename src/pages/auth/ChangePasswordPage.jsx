import { Navigate, useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { selectIsAuthenticated, selectMustChangePassword } from '@/store/slices/authSlice'
import { landingPathFor } from '@/config/permissions'
import { useSignOut } from '@/hooks/useSignOut'
import { useToast } from '@/hooks/useToast'
import { decodeJwt } from '@/utils/jwt'
import ChangePasswordForm from '@/components/account/ChangePasswordForm'
import AuthCard from '@/components/common/AuthCard'

// Used both voluntarily and when the account has a temporary password (mustChangePassword).
// In the forced case every other page is blocked by ProtectedRoute until this succeeds.
export default function ChangePasswordPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const signOut = useSignOut()
  const isAuthenticated = useSelector(selectIsAuthenticated)
  const forced = useSelector(selectMustChangePassword)

  if (!isAuthenticated) return <Navigate to="/login?next=%2Fchange-password" replace />

  const onSuccess = (session) => {
    toast.success('Your password was changed. Other devices were signed out.')
    const claims = decodeJwt(session.accessToken)
    navigate(landingPathFor({ role: session.role ?? claims?.role, status: session.status ?? claims?.status, perms: claims?.perms ?? [] }), {
      replace: true,
    })
  }

  return (
    <AuthCard
      title={forced ? 'Set a new password' : 'Change password'}
      description={
        forced
          ? 'Your account was created with a temporary password. Choose your own password to continue.'
          : 'You will stay signed in here. Other devices will be signed out.'
      }
      footer={
        forced ? (
          <button type="button" onClick={signOut} className="font-semibold text-primary-700 hover:underline dark:text-primary-300">
            Sign out instead
          </button>
        ) : (
          <button type="button" onClick={() => navigate(-1)} className="font-semibold text-primary-700 hover:underline dark:text-primary-300">
            Cancel
          </button>
        )
      }
    >
      <ChangePasswordForm onSuccess={onSuccess} currentLabel={forced ? 'Temporary password' : 'Current password'} />
    </AuthCard>
  )
}
