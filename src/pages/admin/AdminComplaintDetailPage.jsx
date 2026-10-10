import { Link, useParams } from 'react-router-dom'
import { Gavel, MessageSquareWarning, Store } from 'lucide-react'
import * as adminApi from '@/api/admin'
import { COMPLAINT_DECISION_OPTIONS, OPEN_COMPLAINT_STATUSES } from '@/config/admin'
import { useActionDialog } from '@/hooks/useActionDialog'
import { useAsync } from '@/hooks/useAsync'
import { formatDateTime, humanizeEnum } from '@/utils/format'
import DecisionDialog from '@/components/admin/DecisionDialog'
import PageHeader from '@/components/common/PageHeader'
import SmartImage from '@/components/common/SmartImage'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import EmptyState from '@/components/ui/EmptyState'
import ErrorState from '@/components/ui/ErrorState'
import Skeleton from '@/components/ui/Skeleton'
import StatusBadge from '@/components/ui/StatusBadge'

const linkClass = 'font-medium text-primary-700 hover:underline dark:text-primary-300'

/*
 * The contract does not list complaint response fields. Names follow the request bodies:
 * customer { type, text, attachmentKeys } -> attachmentUrls, store { response }, admin { decision, notes };
 * customerPublicId / storePublicId are read when present. Missing fields are not shown.
 */
export default function AdminComplaintDetailPage() {
  const { publicId } = useParams()
  const dialog = useActionDialog()
  const { data: c, status, error, reload, setData } = useAsync(() => adminApi.getComplaint(publicId), publicId)

  if (status === 'failed') {
    return error?.status === 404 ? (
      <EmptyState icon={MessageSquareWarning} title="Complaint not found" action={<Button to="/admin/complaints">All complaints</Button>} />
    ) : (
      <ErrorState error={error} onRetry={reload} />
    )
  }
  if (!c) return <Skeleton className="h-96 w-full" />

  const canDecide = OPEN_COMPLAINT_STATUSES.includes(c.status) && !c.decision

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: 'Complaints', to: '/admin/complaints' }, { label: c.publicId }]}
        title={
          <span className="flex flex-wrap items-center gap-3">
            {c.publicId}
            <StatusBadge value={c.status} type="ComplaintStatus" className="text-sm" />
          </span>
        }
        description={
          <span className="flex flex-wrap gap-x-3">
            {c.orderPublicId && (
              <span>
                Order{' '}
                <Link to={`/admin/orders/${c.orderPublicId}`} className={linkClass}>
                  {c.orderPublicId}
                </Link>
              </span>
            )}
            {c.customerPublicId && (
              <Link to={`/admin/users/${c.customerPublicId}`} className={linkClass}>
                Customer account
              </Link>
            )}
            {c.storePublicId && (
              <Link to={`/admin/stores/${c.storePublicId}`} className={linkClass}>
                Store
              </Link>
            )}
          </span>
        }
        actions={
          canDecide && (
            <Button leftIcon={Gavel} onClick={() => dialog.open('decide')}>
              Decide
            </Button>
          )
        }
      />
      <div className="space-y-6">
        <Card>
          <Card.Header title={humanizeEnum(c.type)} description={`Filed ${formatDateTime(c.createdAt)}`} />
          <Card.Body className="space-y-4">
            <p className="text-sm whitespace-pre-line text-slate-700 dark:text-slate-300">{c.text}</p>
            {c.attachmentUrls?.length > 0 && (
              <ul className="flex flex-wrap gap-2">
                {c.attachmentUrls.map((url) => (
                  <li key={url}>
                    <SmartImage src={url} alt="Attachment" className="size-20 rounded-xl" />
                  </li>
                ))}
              </ul>
            )}
          </Card.Body>
        </Card>
        <Card>
          <Card.Header title="Store’s answer" />
          <Card.Body>
            {c.response ? (
              <p className="flex gap-3 text-sm">
                <Store aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-slate-400" />
                <span className="whitespace-pre-line text-slate-700 dark:text-slate-300">{c.response}</span>
              </p>
            ) : (
              <p className="text-sm text-slate-500">The store has not answered.</p>
            )}
          </Card.Body>
        </Card>
        {(c.decision || c.notes) && (
          <Card>
            <Card.Header title="Decision" />
            <Card.Body className="space-y-2 text-sm">
              {c.decision && <StatusBadge value={c.decision} type="Decision" />}
              {c.notes && <p className="whitespace-pre-line text-slate-700 dark:text-slate-300">{c.notes}</p>}
            </Card.Body>
          </Card>
        )}
      </div>

      {dialog.isOpen('decide') && (
        <DecisionDialog
          title="Decide this complaint"
          description="Both the customer and the store see the decision and your notes."
          options={COMPLAINT_DECISION_OPTIONS}
          noteLabel="Notes"
          confirmLabel="Save decision"
          error={dialog.error}
          onCancel={dialog.close}
          onConfirm={dialog.run(
            (decision, notes) => adminApi.decideComplaint(publicId, { decision, notes }),
            'Decision saved.',
            (result) => (result?.publicId === publicId ? setData(result) : reload()),
            (err) => {
              if (err?.code === 'COMPLAINT_ALREADY_DECIDED') {
                dialog.close()
                reload()
              }
            },
          )}
        />
      )}
    </>
  )
}
