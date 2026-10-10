import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Gavel, MessageSquareWarning, Store } from 'lucide-react'
import * as ordersApi from '@/api/orders'
import { errorMessage } from '@/config/errorMessages'
import { REPLY_TEXT_MAX } from '@/config/merchant'
import { ACTION_ACCESS } from '@/config/permissions'
import { useAsync } from '@/hooks/useAsync'
import { useMerchantStatus } from '@/hooks/useMerchantStatus'
import { usePermissions } from '@/hooks/usePermissions'
import { useToast } from '@/hooks/useToast'
import { formatDateTime, humanizeEnum } from '@/utils/format'
import { validateReason } from '@/utils/validators'
import FormAlert from '@/components/common/FormAlert'
import PageHeader from '@/components/common/PageHeader'
import SmartImage from '@/components/common/SmartImage'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import EmptyState from '@/components/ui/EmptyState'
import ErrorState from '@/components/ui/ErrorState'
import FormField from '@/components/ui/FormField'
import Skeleton from '@/components/ui/Skeleton'
import StatusBadge from '@/components/ui/StatusBadge'
import Textarea from '@/components/ui/Textarea'

function ResponseForm({ complaint, onSaved }) {
  const toast = useToast()
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  const [formMessage, setFormMessage] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (event) => {
    event.preventDefault()
    const problem = validateReason(text, { max: REPLY_TEXT_MAX }) && 'Write your answer (up to 2000 characters).'
    setError(problem)
    setFormMessage('')
    if (problem) return
    setBusy(true)
    try {
      const saved = await ordersApi.respondToComplaint(complaint.publicId, text.trim())
      toast.success('Your answer was sent.')
      onSaved(saved)
    } catch (err) {
      setFormMessage(errorMessage(err))
      // Someone else answered meanwhile: show their answer.
      if (err?.code === 'COMPLAINT_ALREADY_RESPONDED') onSaved(null)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-3">
      {formMessage && <FormAlert>{formMessage}</FormAlert>}
      <FormField label="Your answer" required error={error} hint="You can answer once. Be specific: the marketplace team reads it before deciding.">
        <Textarea value={text} onChange={(e) => setText(e.target.value)} maxLength={REPLY_TEXT_MAX} rows={5} />
      </FormField>
      <div className="flex justify-end">
        <Button type="submit" loading={busy}>
          Send answer
        </Button>
      </div>
    </form>
  )
}

/*
 * The contract does not list the complaint response fields. Names follow the request bodies:
 * customer { type, text, attachmentKeys } -> attachmentUrls, store { response }, admin { decision, notes }.
 * Missing fields are not shown.
 */
export default function MerchantComplaintDetailPage() {
  const { publicId } = useParams()
  const { hasAllPerms } = usePermissions()
  const { readOnly } = useMerchantStatus()
  const { data: complaint, status, error, reload, setData } = useAsync(() => ordersApi.getMerchantComplaint(publicId), publicId)

  if (status === 'loading' || status === 'idle') {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }
  if (status === 'failed') {
    return error?.status === 404 ? (
      <EmptyState icon={MessageSquareWarning} title="Complaint not found" action={<Button to="/merchant/complaints">All complaints</Button>} />
    ) : (
      <ErrorState error={error} onRetry={reload} />
    )
  }

  const canRespond = !readOnly && hasAllPerms(ACTION_ACCESS.respondToComplaint) && !complaint.response
  // The answer comes back from the server; if the shape is not the complaint, reload it.
  const onSaved = (saved) => (saved?.publicId === complaint.publicId ? setData(saved) : reload())

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: 'Complaints', to: '/merchant/complaints' }, { label: complaint.publicId }]}
        title={
          <span className="flex flex-wrap items-center gap-3">
            {complaint.publicId}
            <StatusBadge value={complaint.status} type="ComplaintStatus" className="text-sm" />
          </span>
        }
        description={
          complaint.orderPublicId && (
            <>
              About order{' '}
              <Link to={`/merchant/orders/${complaint.orderPublicId}`} className="font-medium text-primary-700 hover:underline dark:text-primary-300">
                {complaint.orderPublicId}
              </Link>
            </>
          )
        }
      />
      <div className="space-y-6">
        <Card>
          <Card.Header title={humanizeEnum(complaint.type)} description={`Filed ${formatDateTime(complaint.createdAt)}`} />
          <Card.Body className="space-y-4">
            <p className="text-sm whitespace-pre-line text-slate-700 dark:text-slate-300">{complaint.text}</p>
            {complaint.attachmentUrls?.length > 0 && (
              <ul className="flex flex-wrap gap-2">
                {complaint.attachmentUrls.map((url) => (
                  <li key={url}>
                    <SmartImage src={url} alt="Attachment" className="size-20 rounded-xl" />
                  </li>
                ))}
              </ul>
            )}
          </Card.Body>
        </Card>

        <Card>
          <Card.Header title="Your store’s answer" />
          <Card.Body>
            {complaint.response ? (
              <div className="flex gap-3 text-sm">
                <Store aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-slate-400" />
                <p className="whitespace-pre-line text-slate-700 dark:text-slate-300">{complaint.response}</p>
              </div>
            ) : canRespond ? (
              <ResponseForm complaint={complaint} onSaved={onSaved} />
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-400">Not answered yet.</p>
            )}
          </Card.Body>
        </Card>

        {(complaint.decision || complaint.notes) && (
          <Card>
            <Card.Header title="Marketplace decision" />
            <Card.Body className="flex gap-3 text-sm">
              <Gavel aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-slate-400" />
              <div className="space-y-1">
                {complaint.decision && <StatusBadge value={complaint.decision} type="Decision" />}
                {complaint.notes && <p className="whitespace-pre-line text-slate-700 dark:text-slate-300">{complaint.notes}</p>}
              </div>
            </Card.Body>
          </Card>
        )}
      </div>
    </>
  )
}
