import { useState } from 'react'
import { useDispatch } from 'react-redux'
import { changePassword } from '@/store/slices/authSlice'
import { useRetryAfter } from '@/hooks/useRetryAfter'
import { splitApiError } from '@/utils/formErrors'
import { compactErrors, LIMITS, validatePassword, validateRequired } from '@/utils/validators'
import FormAlert from '@/components/common/FormAlert'
import Button from '@/components/ui/Button'
import FormField from '@/components/ui/FormField'
import PasswordInput from '@/components/ui/PasswordInput'

const EMPTY = { currentPassword: '', newPassword: '', confirmPassword: '' }

/**
 * Change password (used by /change-password and the profile page).
 * On success the server returns NEW tokens which replace the session (other devices are signed out);
 * then `onSuccess(session)` runs.
 */
export default function ChangePasswordForm({ onSuccess, currentLabel = 'Current password', submitLabel = 'Save new password', fullWidth = true }) {
  const dispatch = useDispatch()
  const [values, setValues] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const retry = useRetryAfter()

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
      currentPassword: validateRequired(values.currentPassword, currentLabel),
      newPassword:
        validatePassword(values.newPassword) ||
        (values.newPassword === values.currentPassword ? 'Choose a password different from the current one.' : ''),
      confirmPassword: values.confirmPassword === values.newPassword ? '' : 'Passwords do not match.',
    })
    setErrors(clientErrors)
    if (Object.keys(clientErrors).length) return

    setSubmitting(true)
    try {
      const session = await dispatch(
        changePassword({ currentPassword: values.currentPassword, newPassword: values.newPassword }),
      ).unwrap()
      setValues(EMPTY)
      setSubmitting(false)
      onSuccess?.(session)
    } catch (error) {
      setSubmitting(false)
      if (error?.status === 429) retry.start(error.retryAfter)
      // INVALID_CREDENTIALS (wrong current password), WEAK_PASSWORD, PASSWORD_REUSED, VALIDATION_FAILED
      if (error?.code === 'INVALID_CREDENTIALS') {
        setErrors({ currentPassword: error.message })
      } else if (error?.code === 'WEAK_PASSWORD' || error?.code === 'PASSWORD_REUSED') {
        setErrors({ newPassword: error.message })
      } else {
        const { fieldErrors, formMessage } = splitApiError(error)
        setErrors(fieldErrors)
        setFormError(formMessage)
      }
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      {formError && (
        <FormAlert>
          {formError}
          {retry.isWaiting && <span className="mt-1 block font-medium tabular-nums">You can try again in {retry.secondsLeft}s.</span>}
        </FormAlert>
      )}
      <FormField label={currentLabel} error={errors.currentPassword} required>
        <PasswordInput autoComplete="current-password" maxLength={LIMITS.passwordMax} {...bind('currentPassword')} />
      </FormField>
      <FormField label="New password" error={errors.newPassword} required>
        <PasswordInput autoComplete="new-password" maxLength={LIMITS.passwordMax} showChecklist {...bind('newPassword')} />
      </FormField>
      <FormField label="Confirm new password" error={errors.confirmPassword} required>
        <PasswordInput autoComplete="new-password" maxLength={LIMITS.passwordMax} {...bind('confirmPassword')} />
      </FormField>
      <Button type="submit" fullWidth={fullWidth} size={fullWidth ? 'lg' : 'md'} loading={submitting} disabled={retry.isWaiting}>
        {retry.isWaiting ? `Try again in ${retry.secondsLeft}s` : submitLabel}
      </Button>
    </form>
  )
}
