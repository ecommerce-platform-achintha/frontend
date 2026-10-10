import { useState } from 'react'
import { useDispatch } from 'react-redux'
import { FileText } from 'lucide-react'
import * as usersApi from '@/api/users'
import { fetchProfile } from '@/store/slices/authSlice'
import { MAX_MERCHANT_DOCUMENTS } from '@/config/constants'
import { errorMessage } from '@/config/errorMessages'
import { useAsync } from '@/hooks/useAsync'
import { useToast } from '@/hooks/useToast'
import { formatDateTime, humanizeEnum } from '@/utils/format'
import { splitApiError } from '@/utils/formErrors'
import { LIMITS, validateName } from '@/utils/validators'
import FormAlert from '@/components/common/FormAlert'
import PageHeader from '@/components/common/PageHeader'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import ErrorState from '@/components/ui/ErrorState'
import FilePicker from '@/components/ui/FilePicker'
import FormField from '@/components/ui/FormField'
import Input from '@/components/ui/Input'
import Skeleton from '@/components/ui/Skeleton'
import StatusBadge from '@/components/ui/StatusBadge'

function ResubmitForm({ application, onDone }) {
  const [businessName, setBusinessName] = useState(application.businessName ?? '')
  const [documentKeys, setDocumentKeys] = useState([])
  const [errors, setErrors] = useState({})
  const [formMessage, setFormMessage] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (event) => {
    event.preventDefault()
    const next = {}
    const nameProblem = validateName(businessName, 'Business name', LIMITS.businessName)
    if (nameProblem) next.businessName = nameProblem
    if (documentKeys.length < 1) next.documentKeys = 'Add at least one document.'
    setErrors(next)
    setFormMessage('')
    if (Object.keys(next).length) return
    setBusy(true)
    try {
      await usersApi.resubmitMerchantApplication({ businessName: businessName.trim(), documentKeys })
      onDone()
    } catch (err) {
      const { fieldErrors } = splitApiError(err)
      setErrors(fieldErrors)
      setFormMessage(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      {formMessage && <FormAlert>{formMessage}</FormAlert>}
      <FormField label="Business name" required error={errors.businessName}>
        <Input value={businessName} onChange={(e) => setBusinessName(e.target.value)} maxLength={LIMITS.businessName} />
      </FormField>
      <FormField label="Documents" required error={errors.documentKeys} hint="Business registration, ID and similar. 1 to 10 files.">
        <FilePicker value={documentKeys} onChange={setDocumentKeys} maxFiles={MAX_MERCHANT_DOCUMENTS} minFiles={1} accept="image/*,application/pdf" folder="merchant-documents" label="Add documents" />
      </FormField>
      <div className="flex justify-end">
        <Button type="submit" loading={busy}>
          Resubmit application
        </Button>
      </div>
    </form>
  )
}

export default function MerchantApplicationPage() {
  const dispatch = useDispatch()
  const toast = useToast()
  const { data: app, status, error, reload } = useAsync(() => usersApi.getMerchantApplication(), 'application')

  if (status === 'loading' || status === 'idle') return <Skeleton className="h-64 w-full" />
  if (status === 'failed') return <ErrorState error={error} onRetry={reload} />

  const limitReached = app.attemptsUsed >= app.maxAttempts

  return (
    <>
      <PageHeader title="Merchant application" description="Your request to sell on the marketplace." />
      <div className="space-y-6">
        <Card>
          <Card.Header
            title={
              <span className="flex flex-wrap items-center gap-3">
                Status <StatusBadge value={app.status} type="UserStatus" />
              </span>
            }
          />
          <Card.Body className="space-y-4 text-sm">
            {app.statusReason && (
              <FormAlert tone={app.status === 'REJECTED' ? 'error' : 'info'} title="Reason from the marketplace team">
                {app.statusReason}
              </FormAlert>
            )}
            <dl className="grid gap-4 sm:grid-cols-3">
              <div>
                <dt className="text-xs text-slate-500 dark:text-slate-400">Attempts used</dt>
                <dd className="text-lg font-semibold tabular-nums">
                  {app.attemptsUsed} of {app.maxAttempts}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500 dark:text-slate-400">Latest decision</dt>
                <dd className="font-medium">{app.decision ? humanizeEnum(app.decision) : 'Waiting for review'}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500 dark:text-slate-400">Decided</dt>
                <dd>{formatDateTime(app.decidedAt)}</dd>
              </div>
            </dl>
          </Card.Body>
        </Card>

        <Card>
          <Card.Header title={`Latest submission${app.attemptNo ? ` (attempt ${app.attemptNo})` : ''}`} description={`Sent ${formatDateTime(app.submittedAt)}`} />
          <Card.Body className="space-y-3 text-sm">
            <p>
              <span className="text-slate-500 dark:text-slate-400">Business name: </span>
              <span className="font-medium">{app.businessName}</span>
            </p>
            {app.documentKeys?.length > 0 && (
              <ul className="space-y-1">
                {app.documentKeys.map((key) => (
                  <li key={key} className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                    <FileText aria-hidden="true" className="size-4 text-slate-400" />
                    <span className="truncate">{key.split('/').pop()}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card.Body>
        </Card>

        {app.canResubmit ? (
          <Card>
            <Card.Header title="Resubmit your application" description="Fix what the reason above mentions, then send it again." />
            <Card.Body>
              <ResubmitForm
                application={app}
                onDone={() => {
                  toast.success('Application sent. We will let you know the decision.')
                  reload()
                  dispatch(fetchProfile()) // the account status changes after a resubmission
                }}
              />
            </Card.Body>
          </Card>
        ) : (
          app.status === 'REJECTED' &&
          limitReached && (
            <FormAlert title="No attempts left">
              You have used all {app.maxAttempts} application attempts, so the application cannot be sent again. Contact the marketplace team if you
              think this is a mistake.
            </FormAlert>
          )
        )}
      </div>
    </>
  )
}
