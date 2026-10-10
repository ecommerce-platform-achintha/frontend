import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { fetchProfile, selectProfile, selectProfileStatus, updateProfile } from '@/store/slices/authSlice'
import { ROLE_LABELS } from '@/config/permissions'
import { useToast } from '@/hooks/useToast'
import { formatDate } from '@/utils/format'
import { splitApiError } from '@/utils/formErrors'
import { compactErrors, LIMITS, normalizePhone, validateName, validatePhone } from '@/utils/validators'
import ChangePasswordForm from '@/components/account/ChangePasswordForm'
import AsyncContent from '@/components/common/AsyncContent'
import FormAlert from '@/components/common/FormAlert'
import PageHeader from '@/components/common/PageHeader'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import FormField from '@/components/ui/FormField'
import Input from '@/components/ui/Input'
import StatusBadge from '@/components/ui/StatusBadge'

function Detail({ label, children }) {
  return (
    <div>
      <dt className="text-xs text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium break-all text-slate-900 dark:text-white">{children}</dd>
    </div>
  )
}

function ProfileForm({ profile }) {
  const dispatch = useDispatch()
  const toast = useToast()
  const [values, setValues] = useState({ firstName: profile.firstName ?? '', lastName: profile.lastName ?? '', phone: profile.phone ?? '' })
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  const bind = (field) => ({
    value: values[field],
    onChange: (e) => {
      setValues((v) => ({ ...v, [field]: e.target.value }))
      if (errors[field]) setErrors((x) => ({ ...x, [field]: '' }))
    },
  })

  const submit = async (event) => {
    event.preventDefault()
    setFormError('')
    const clientErrors = compactErrors({
      firstName: validateName(values.firstName, 'First name'),
      lastName: validateName(values.lastName, 'Last name'),
      phone: validatePhone(values.phone, { required: false }),
    })
    setErrors(clientErrors)
    if (Object.keys(clientErrors).length) return
    setSaving(true)
    try {
      await dispatch(
        updateProfile({
          firstName: values.firstName.trim(),
          lastName: values.lastName.trim(),
          phone: normalizePhone(values.phone) || undefined,
        }),
      ).unwrap()
      toast.success('Your details were saved.')
    } catch (error) {
      const { fieldErrors, formMessage } = splitApiError(error)
      setErrors(fieldErrors)
      setFormError(formMessage)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      {formError && <FormAlert>{formError}</FormAlert>}
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="First name" error={errors.firstName} required>
          <Input autoComplete="given-name" maxLength={LIMITS.name} {...bind('firstName')} />
        </FormField>
        <FormField label="Last name" error={errors.lastName} required>
          <Input autoComplete="family-name" maxLength={LIMITS.name} {...bind('lastName')} />
        </FormField>
      </div>
      <FormField label="Mobile number" hint="For example +94771234567" error={errors.phone}>
        <Input type="tel" inputMode="tel" autoComplete="tel" maxLength={20} {...bind('phone')} />
      </FormField>
      <div className="flex justify-end">
        <Button type="submit" loading={saving}>
          Save details
        </Button>
      </div>
    </form>
  )
}

export default function ProfilePage() {
  const dispatch = useDispatch()
  const toast = useToast()
  const profile = useSelector(selectProfile)
  const status = useSelector(selectProfileStatus)

  // The profile is loaded at sign-in; load it again if that failed.
  useEffect(() => {
    if (!profile && status !== 'loading') dispatch(fetchProfile())
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only on first visit
  }, [dispatch])

  return (
    <>
      <PageHeader title="Profile" description="Your account details." />
      <AsyncContent status={profile ? 'succeeded' : status} error={{ message: 'Your profile could not be loaded.' }} onRetry={() => dispatch(fetchProfile())}>
        {profile && (
          <div className="space-y-6">
            <Card>
              <Card.Header title="Account" />
              <Card.Body>
                <dl className="grid gap-4 sm:grid-cols-2">
                  <Detail label="Email">{profile.email}</Detail>
                  {/* Own data, so the full NIC is shown. */}
                  <Detail label="NIC">{profile.nic ?? '—'}</Detail>
                  <Detail label="Account type">{ROLE_LABELS[profile.role] ?? profile.role}</Detail>
                  <Detail label="Status">
                    <StatusBadge value={profile.status} type="UserStatus" />
                  </Detail>
                  <Detail label="Customer ID">{profile.publicId}</Detail>
                  <Detail label="Member since">{formatDate(profile.createdAt)}</Detail>
                </dl>
              </Card.Body>
            </Card>

            <Card>
              <Card.Header title="Your details" description="Your email and NIC cannot be changed here." />
              <Card.Body>
                <ProfileForm key={profile.publicId} profile={profile} />
              </Card.Body>
            </Card>

            <Card>
              <Card.Header title="Change password" description="You stay signed in here. Other devices will be signed out." />
              <Card.Body className="max-w-lg">
                <ChangePasswordForm fullWidth={false} onSuccess={() => toast.success('Your password was changed. Other devices were signed out.')} />
              </Card.Body>
            </Card>
          </div>
        )}
      </AsyncContent>
    </>
  )
}
