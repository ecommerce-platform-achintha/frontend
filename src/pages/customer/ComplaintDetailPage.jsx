import { Link, useParams } from 'react-router-dom'
import { Gavel, MessageSquareWarning, Store } from 'lucide-react'
import * as ordersApi from '@/api/orders'
import { COMPLAINT_TYPE_LABELS } from '@/config/orders'
import { useAsync } from '@/hooks/useAsync'
import { formatDateTime } from '@/utils/format'
import PageHeader from '@/components/common/PageHeader'
import SmartImage from '@/components/common/SmartImage'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import EmptyState from '@/components/ui/EmptyState'
import ErrorState from '@/components/ui/ErrorState'
import Skeleton from '@/components/ui/Skeleton'
import StatusBadge from '@/components/ui/StatusBadge'

/*
 * The contract does not list the complaint response fields. Names below follow the request
 * bodies: create { type, text, attachmentKeys } -> attachmentUrls, merchant { response },
 * admin decision { decision, notes }. Missing fields are simply not shown.
 */
export default function ComplaintDetailPage() {
  const { publicId } = useParams()
  const { data: complaint, status, error, reload } = useAsync(() => ordersApi.getCustomerComplaint(publicId), publicId)

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
      <EmptyState icon={MessageSquareWarning} title="Complaint not found" action={<Button to="/complaints">My complaints</Button>} />
    ) : (
      <ErrorState error={error} onRetry={reload} />
    )
  }

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: 'Complaints', to: '/complaints' }, { label: complaint.publicId }]}
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
              <Link to={`/orders/${complaint.orderPublicId}`} className="font-medium text-primary-700 hover:underline dark:text-primary-300">
                {complaint.orderPublicId}
              </Link>
            </>
          )
        }
      />
      <div className="space-y-6">
        <Card>
          <Card.Header title={COMPLAINT_TYPE_LABELS[complaint.type] ?? complaint.type} description={`Filed ${formatDateTime(complaint.createdAt)}`} />
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
          <Card.Header title="Store’s response" />
          <Card.Body>
            {complaint.response ? (
              <div className="flex gap-3 text-sm">
                <Store aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-slate-400" />
                <p className="whitespace-pre-line text-slate-700 dark:text-slate-300">{complaint.response}</p>
              </div>
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-400">The store has not responded yet.</p>
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
