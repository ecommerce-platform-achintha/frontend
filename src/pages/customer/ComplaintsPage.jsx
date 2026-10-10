import { useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { MessageSquareWarning } from 'lucide-react'
import {
  fetchCustomerComplaints,
  selectCustomerComplaints,
  selectCustomerComplaintsError,
  selectCustomerComplaintsPageInfo,
  selectCustomerComplaintsStatus,
} from '@/store/slices/customerComplaintsSlice'
import { COMPLAINT_SORT, COMPLAINT_TYPE_LABELS } from '@/config/orders'
import { useToast } from '@/hooks/useToast'
import { useUrlQuery } from '@/hooks/useUrlQuery'
import { formatDate } from '@/utils/format'
import { isPublicId } from '@/utils/ids'
import AsyncContent from '@/components/common/AsyncContent'
import PageHeader from '@/components/common/PageHeader'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import EmptyState from '@/components/ui/EmptyState'
import Modal from '@/components/ui/Modal'
import Pagination from '@/components/ui/Pagination'
import StatusBadge from '@/components/ui/StatusBadge'
import Table from '@/components/ui/Table'
import NewComplaintForm from './NewComplaintForm'

const DEFAULTS = { order: '', page: 0, size: 20 }

const COLUMNS = [
  { key: 'publicId', header: 'Complaint', primary: true, render: (c) => <span className="font-medium text-slate-900 dark:text-white">{c.publicId}</span> },
  { key: 'orderPublicId', header: 'Order' },
  { key: 'type', header: 'Type', render: (c) => COMPLAINT_TYPE_LABELS[c.type] ?? c.type },
  { key: 'status', header: 'Status', render: (c) => <StatusBadge value={c.status} type="ComplaintStatus" /> },
  { key: 'createdAt', header: 'Filed', className: 'whitespace-nowrap', render: (c) => formatDate(c.createdAt) },
]

export default function ComplaintsPage() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const toast = useToast()
  const [query, setQuery] = useUrlQuery(DEFAULTS)
  const items = useSelector(selectCustomerComplaints)
  const pageInfo = useSelector(selectCustomerComplaintsPageInfo)
  const status = useSelector(selectCustomerComplaintsStatus)
  const error = useSelector(selectCustomerComplaintsError)

  const params = useMemo(() => ({ page: query.page, size: query.size, sort: COMPLAINT_SORT }), [query.page, query.size])
  useEffect(() => {
    dispatch(fetchCustomerComplaints(params))
  }, [dispatch, params])

  // "New complaint" is started from an order page: /complaints?order=ORD-...
  const newFor = isPublicId(query.order, 'ORD') ? query.order : null
  const closeForm = () => setQuery({ order: '' }, { resetPage: false, replace: true })

  return (
    <>
      <PageHeader title="Complaints" description="Problems you reported about your orders." />
      <Card className="p-4 sm:p-5">
        <AsyncContent
          status={status}
          error={error}
          onRetry={() => dispatch(fetchCustomerComplaints(params))}
          isEmpty={items.length === 0}
          empty={
            <EmptyState
              icon={MessageSquareWarning}
              title="No complaints"
              description="To report a problem, open the order and choose “Report a problem”."
              action={<Button to="/orders">Go to my orders</Button>}
            />
          }
        >
          <Table columns={COLUMNS} rows={items} caption="Your complaints" onRowClick={(c) => navigate(`/complaints/${c.publicId}`)} />
          <Pagination {...pageInfo} onPageChange={(page) => setQuery({ page }, { resetPage: false })} />
        </AsyncContent>
      </Card>

      <Modal open={Boolean(newFor)} onClose={closeForm} title="Report a problem" description={newFor ? `Order ${newFor}` : undefined} size="lg">
        {newFor && (
          <NewComplaintForm
            key={newFor}
            orderPublicId={newFor}
            onCancel={closeForm}
            onCreated={(created) => {
              toast.success('Your complaint was sent to the store.')
              if (created?.publicId) navigate(`/complaints/${created.publicId}`, { replace: true })
              else {
                closeForm()
                dispatch(fetchCustomerComplaints(params))
              }
            }}
          />
        )}
      </Modal>
    </>
  )
}
