import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import * as usersApi from '@/api/users'
import { MAX_MERCHANT_DOCUMENTS } from '@/config/constants'
import { useRetryAfter } from '@/hooks/useRetryAfter'
import { splitApiError } from '@/utils/formErrors'
import { compactErrors, LIMITS, validateName } from '@/utils/validators'
import AuthCard from '@/components/common/AuthCard'
import FormAlert from '@/components/common/FormAlert'
import Button from '@/components/ui/Button'
import FilePicker from '@/components/ui/FilePicker'
import FormField from '@/components/ui/FormField'
import Input from '@/components/ui/Input'
import Stepper from '@/components/ui/Stepper'
import AccountFields from './AccountFields'
import { ACCOUNT_FIELDS, EMPTY_ACCOUNT, toAccountBody, validateAccount } from './accountForm'

const STEPS = [
  { key: 'account', label: 'Your account' },
  { key: 'business', label: 'Business details' },
]

function validateBusiness({ businessName, documentKeys }) {
  return compactErrors({
    businessName: validateName(businessName, 'Business name', LIMITS.businessName),
    documentKeys:
      documentKeys.length < 1
        ? 'Add at least one document (for example your business registration).'
        : documentKeys.length > MAX_MERCHANT_DOCUMENTS
          ? `Add at most ${MAX_MERCHANT_DOCUMENTS} documents.`
          : '',
  })
}

export default function RegisterMerchantPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [values, setValues] = useState({ ...EMPTY_ACCOUNT, businessName: '', documentKeys: [] })
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const retry = useRetryAfter()

  const onChange = (field, value) => {
    setValues((v) => ({ ...v, [field]: value }))
    if (errors[field]) setErrors((e) => ({ ...e, [field]: '' }))
  }

  const goToBusiness = (event) => {
    event.preventDefault()
    const clientErrors = validateAccount(values)
    setErrors(clientErrors)
    if (Object.keys(clientErrors).length === 0) {
      setFormError('')
      setStep(1)
    }
  }

  const onSubmit = async (event) => {
    event.preventDefault()
    setFormError('')
    const clientErrors = validateBusiness(values)
    setErrors(clientErrors)
    if (Object.keys(clientErrors).length) return

    setSubmitting(true)
    try {
      await usersApi.registerMerchant({
        ...toAccountBody(values),
        businessName: values.businessName.trim(),
        documentKeys: values.documentKeys,
      })
      navigate('/login', {
        replace: true,
        state: {
          email: values.email.trim(),
          notice:
            'Your seller account was created and is waiting for approval. You can sign in now and set up your store while we review it.',
        },
      })
    } catch (error) {
      setSubmitting(false)
      if (error?.status === 429) retry.start(error.retryAfter)
      const { fieldErrors, formMessage } = splitApiError(error)
      setErrors(fieldErrors)
      setFormError(formMessage)
      // Problems with step 1 fields (e.g. EMAIL_ALREADY_EXISTS): go back so the user sees them.
      if (Object.keys(fieldErrors).some((f) => ACCOUNT_FIELDS.includes(f))) setStep(0)
    }
  }

  return (
    <AuthCard
      wide
      title="Sell on Marketplace"
      description="Create a seller account. An admin reviews every new store before products can go live."
      footer={
        <>
          Already registered?{' '}
          <Link to="/login" className="font-semibold text-primary-700 hover:underline dark:text-primary-300">
            Sign in
          </Link>
        </>
      }
    >
      <Stepper steps={STEPS} currentIndex={step} className="mb-6" />

      {formError && (
        <FormAlert className="mb-5">
          {formError}
          {retry.isWaiting && <span className="mt-1 block font-medium tabular-nums">You can try again in {retry.secondsLeft}s.</span>}
        </FormAlert>
      )}

      {step === 0 ? (
        <form onSubmit={goToBusiness} noValidate className="space-y-6">
          <AccountFields values={values} errors={errors} onChange={onChange} />
          <Button type="submit" fullWidth size="lg" rightIcon={ArrowRight}>
            Continue
          </Button>
        </form>
      ) : (
        <form onSubmit={onSubmit} noValidate className="space-y-6">
          <FormField label="Business name" error={errors.businessName} required>
            <Input
              autoComplete="organization"
              maxLength={LIMITS.businessName}
              value={values.businessName}
              onChange={(e) => onChange('businessName', e.target.value)}
            />
          </FormField>
          <FormField
            label="Business documents"
            hint={`Business registration, ID or similar. 1 to ${MAX_MERCHANT_DOCUMENTS} files.`}
            error={errors.documentKeys}
            required
          >
            <FilePicker
              value={values.documentKeys}
              onChange={(keys) => onChange('documentKeys', keys)}
              maxFiles={MAX_MERCHANT_DOCUMENTS}
              minFiles={1}
              accept="image/*,application/pdf"
              folder="merchant-documents"
              label="Add documents"
            />
          </FormField>
          <div className="flex flex-col-reverse gap-3 sm:flex-row">
            <Button variant="outline" size="lg" leftIcon={ArrowLeft} onClick={() => setStep(0)} disabled={submitting}>
              Back
            </Button>
            <Button type="submit" size="lg" className="flex-1" loading={submitting} disabled={retry.isWaiting}>
              {retry.isWaiting ? `Try again in ${retry.secondsLeft}s` : 'Create seller account'}
            </Button>
          </div>
        </form>
      )}
    </AuthCard>
  )
}
