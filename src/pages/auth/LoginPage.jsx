import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { Mail } from 'lucide-react'
import { login, selectAccessUser, selectIsAuthenticated, selectMustChangePassword } from '@/store/slices/authSlice'
import { landingPathFor } from '@/config/permissions'
import { useRetryAfter } from '@/hooks/useRetryAfter'
import { decodeJwt } from '@/utils/jwt'
import { safeNextPath, splitApiError } from '@/utils/formErrors'
import { compactErrors, validateEmail, validateRequired } from '@/utils/validators'
import AuthCard from '@/components/common/AuthCard'
import FormAlert from '@/components/common/FormAlert'
import Button from '@/components/ui/Button'
import FormField from '@/components/ui/FormField'
import Input from '@/components/ui/Input'
import PasswordInput from '@/components/ui/PasswordInput'

export default function LoginPage() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  const [params] = useSearchParams()
  const isAuthenticated = useSelector(selectIsAuthenticated)
  const mustChangePassword = useSelector(selectMustChangePassword)
  const currentUser = useSelector(selectAccessUser)

  const [values, setValues] = useState({ email: location.state?.email ?? '', password: '' })
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const retry = useRetryAfter()

  const next = safeNextPath(params.get('next'))
  const notice = location.state?.notice
  const expired = params.get('expired') === '1'

  // Already signed in (e.g. opened /login in a new tab): go where they belong.
  if (isAuthenticated && !submitting) {
    return <Navigate to={mustChangePassword ? '/change-password' : (next ?? landingPathFor(currentUser))} replace />
  }

  const update = (field) => (event) => {
    setValues((v) => ({ ...v, [field]: event.target.value }))
    if (errors[field]) setErrors((e) => ({ ...e, [field]: '' }))
  }

  const onSubmit = async (event) => {
    event.preventDefault()
    setFormError('')
    const clientErrors = compactErrors({
      email: validateEmail(values.email),
      password: validateRequired(values.password, 'Password'),
    })
    setErrors(clientErrors)
    if (Object.keys(clientErrors).length) return

    setSubmitting(true)
    try {
      const session = await dispatch(login({ email: values.email.trim(), password: values.password })).unwrap()
      if (session.mustChangePassword) {
        navigate('/change-password', { replace: true })
        return
      }
      const claims = decodeJwt(session.accessToken)
      const user = { role: session.role ?? claims?.role, status: session.status ?? claims?.status, perms: claims?.perms ?? [] }
      navigate(next ?? landingPathFor(user), { replace: true })
    } catch (error) {
      setSubmitting(false)
      if (error?.status === 429) {
        retry.start(error.retryAfter)
        setFormError(error.message)
        return
      }
      // INVALID_CREDENTIALS, ACCOUNT_BANNED, ACCOUNT_REMOVED, MERCHANT_BANNED: the message has the reason.
      const { fieldErrors, formMessage } = splitApiError(error)
      setErrors(fieldErrors)
      setFormError(formMessage)
    }
  }

  return (
    <AuthCard
      title="Welcome back"
      description="Sign in to shop, manage your store or run the marketplace."
      footer={
        <>
          New here?{' '}
          <Link to="/register" className="font-semibold text-primary-700 hover:underline dark:text-primary-300">
            Create an account
          </Link>{' '}
          or{' '}
          <Link to="/register/merchant" className="font-semibold text-primary-700 hover:underline dark:text-primary-300">
            start selling
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate className="space-y-5">
        {expired && !formError && (
          <FormAlert tone="info" title="Your session expired">
            Please sign in again to continue.
          </FormAlert>
        )}
        {notice && !formError && <FormAlert tone="success">{notice}</FormAlert>}
        {formError && (
          <FormAlert tone="error">
            {formError}
            {retry.isWaiting && <span className="mt-1 block font-medium tabular-nums">You can try again in {retry.secondsLeft}s.</span>}
          </FormAlert>
        )}

        <FormField label="Email" error={errors.email} required>
          <Input type="email" autoComplete="email" leftIcon={Mail} value={values.email} onChange={update('email')} maxLength={254} />
        </FormField>
        <FormField label="Password" error={errors.password} required>
          <PasswordInput autoComplete="current-password" value={values.password} onChange={update('password')} maxLength={128} />
        </FormField>

        <Button type="submit" fullWidth size="lg" loading={submitting} disabled={retry.isWaiting}>
          {retry.isWaiting ? `Try again in ${retry.secondsLeft}s` : 'Sign in'}
        </Button>
        <p className="text-center text-xs text-slate-500 dark:text-slate-400">
          Forgot your password? Password reset is not available yet. Please contact support.
        </p>
      </form>
    </AuthCard>
  )
}
