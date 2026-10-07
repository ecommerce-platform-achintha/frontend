import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { changePassword, selectIsAuthenticated, selectMustChangePassword } from '@/store/slices/authSlice'
import { landingPathFor } from '@/config/permissions'
import { useRetryAfter } from '@/hooks/useRetryAfter'
import { useSignOut } from '@/hooks/useSignOut'
import { useToast } from '@/hooks/useToast'
import { decodeJwt } from '@/utils/jwt'
import { splitApiError } from '@/utils/formErrors'
import { compactErrors, LIMITS, validatePassword, validateRequired } from '@/utils/validators'
import AuthCard from '@/components/common/AuthCard'
import FormAlert from '@/components/common/FormAlert'
import Button from '@/components/ui/Button'
import FormField from '@/components/ui/FormField'
import PasswordInput from '@/components/ui/PasswordInput'

// Used both voluntarily and when the account has a temporary password (mustChangePassword).
// In the forced case every other page is blocked by ProtectedRoute until this succeeds.
export default function ChangePasswordPage() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const toast = useToast()
  const signOut = useSignOut()
  const isAuthenticated = useSelector(selectIsAuthenticated)
  const forced = useSelector(selectMustChangePassword)

  const [values, setValues] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const retry = useRetryAfter()

  if (!isAuthenticated) return <Navigate to="/login?next=%2Fchange-password" replace />

  const bind = (field) => ({
    value: values[field],
    onChange: (e) => {
      setValues((v) => ({ ...v, [field]: e.target.value }))
      if (errors[field]) setErrors((x) => ({ ...x, [field]: '' }))
    },
  })

  const onSubmit = async (event) => {
    event.preventDefault()
    setFormError('')
    const clientErrors = compactErrors({
      currentPassword: validateRequired(values.currentPassword, 'Current password'),
      newPassword:
        validatePassword(values.newPassword) ||
        (values.newPassword === values.currentPassword ? 'Choose a password different from the current one.' : ''),
      confirmPassword: values.confirmPassword === values.newPassword ? '' : 'Passwords do not match.',
    })
    setErrors(clientErrors)
    if (Object.keys(clientErrors).length) return

    setSubmitting(true)
    try {
      // Returns a new session; every other session of this user is signed out.
      const session = await dispatch(
        changePassword({ currentPassword: values.currentPassword, newPassword: values.newPassword }),
      ).unwrap()
      toast.success('Your password was changed. Other devices were signed out.')
      const claims = decodeJwt(session.accessToken)
      navigate(landingPathFor({ role: session.role ?? claims?.role, status: session.status ?? claims?.status, perms: claims?.perms ?? [] }), {
        replace: true,
      })
    } catch (error) {
      setSubmitting(false)
      if (error?.status === 429) retry.start(error.retryAfter)
      // INVALID_CREDENTIALS (wrong current password), WEAK_PASSWORD, PASSWORD_REUSED, VALIDATION_FAILED
      const { fieldErrors, formMessage } = splitApiError(error)
      if (error?.code === 'INVALID_CREDENTIALS') {
        setErrors({ currentPassword: error.message })
      } else if (error?.code === 'WEAK_PASSWORD' || error?.code === 'PASSWORD_REUSED') {
        setErrors({ newPassword: error.message })
      } else {
        setErrors(fieldErrors)
        setFormError(formMessage)
      }
    }
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
      <form onSubmit={onSubmit} noValidate className="space-y-5">
        {formError && (
          <FormAlert>
            {formError}
            {retry.isWaiting && <span className="mt-1 block font-medium tabular-nums">You can try again in {retry.secondsLeft}s.</span>}
          </FormAlert>
        )}
        <FormField label={forced ? 'Temporary password' : 'Current password'} error={errors.currentPassword} required>
          <PasswordInput autoComplete="current-password" maxLength={LIMITS.passwordMax} {...bind('currentPassword')} />
        </FormField>
        <FormField label="New password" error={errors.newPassword} required>
          <PasswordInput autoComplete="new-password" maxLength={LIMITS.passwordMax} showChecklist {...bind('newPassword')} />
        </FormField>
        <FormField label="Confirm new password" error={errors.confirmPassword} required>
          <PasswordInput autoComplete="new-password" maxLength={LIMITS.passwordMax} {...bind('confirmPassword')} />
        </FormField>
        <Button type="submit" fullWidth size="lg" loading={submitting} disabled={retry.isWaiting}>
          {retry.isWaiting ? `Try again in ${retry.secondsLeft}s` : 'Save new password'}
        </Button>
      </form>
    </AuthCard>
  )
}
