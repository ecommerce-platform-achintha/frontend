import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import * as usersApi from '@/api/users'
import { useRetryAfter } from '@/hooks/useRetryAfter'
import { splitApiError } from '@/utils/formErrors'
import AuthCard from '@/components/common/AuthCard'
import FormAlert from '@/components/common/FormAlert'
import Button from '@/components/ui/Button'
import AccountFields from './AccountFields'
import { EMPTY_ACCOUNT, toAccountBody, validateAccount } from './accountForm'

export default function RegisterCustomerPage() {
  const navigate = useNavigate()
  const [values, setValues] = useState(EMPTY_ACCOUNT)
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const retry = useRetryAfter()

  const onChange = (field, value) => {
    setValues((v) => ({ ...v, [field]: value }))
    if (errors[field]) setErrors((e) => ({ ...e, [field]: '' }))
  }

  const onSubmit = async (event) => {
    event.preventDefault()
    setFormError('')
    const clientErrors = validateAccount(values)
    setErrors(clientErrors)
    if (Object.keys(clientErrors).length) return

    setSubmitting(true)
    try {
      // Registration returns a profile, not tokens: the user signs in next.
      await usersApi.registerCustomer(toAccountBody(values))
      navigate('/login', {
        replace: true,
        state: { email: values.email.trim(), notice: 'Your account is ready. Sign in to start shopping.' },
      })
    } catch (error) {
      setSubmitting(false)
      if (error?.status === 429) retry.start(error.retryAfter)
      // EMAIL_ALREADY_EXISTS, NIC_ALREADY_ASSIGNED, WEAK_PASSWORD, VALIDATION_FAILED ...
      const { fieldErrors, formMessage } = splitApiError(error)
      setErrors(fieldErrors)
      setFormError(formMessage)
    }
  }

  return (
    <AuthCard
      wide
      title="Create your account"
      description="Shop from local stores across Sri Lanka."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-primary-700 hover:underline dark:text-primary-300">
            Sign in
          </Link>
          <span className="mx-2">·</span>
          <Link to="/register/merchant" className="font-semibold text-primary-700 hover:underline dark:text-primary-300">
            Register as a seller
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate className="space-y-6">
        {formError && (
          <FormAlert>
            {formError}
            {retry.isWaiting && <span className="mt-1 block font-medium tabular-nums">You can try again in {retry.secondsLeft}s.</span>}
          </FormAlert>
        )}
        <AccountFields values={values} errors={errors} onChange={onChange} />
        <Button type="submit" fullWidth size="lg" loading={submitting} disabled={retry.isWaiting}>
          {retry.isWaiting ? `Try again in ${retry.secondsLeft}s` : 'Create account'}
        </Button>
      </form>
    </AuthCard>
  )
}
