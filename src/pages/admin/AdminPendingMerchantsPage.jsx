import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Check, UserCheck, X } from 'lucide-react'
import * as adminApi from '@/api/admin'
import { adminLists } from '@/store/slices/adminLists'
import { ADMIN_PAGE_SIZE_OPTIONS } from '@/config/constants'
import { useActionDialog } from '@/hooks/useActionDialog'
import { usePagedList } from '@/hooks/usePagedList'
import { useUrlQuery } from '@/hooks/useUrlQuery'
import { formatDate, maskNic } from '@/utils/format'
import AsyncContent from '@/components/common/AsyncContent'
import FormAlert from '@/components/common/FormAlert'
import PageHeader from '@/components/common/PageHeader'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import EmptyState from '@/components/ui/EmptyState'
import Pagination from '@/components/ui/Pagination'
import Table from '@/components/ui/Table'

const DEFAULTS = { page: 0, size: 20 }

export default function AdminPendingMerchantsPage() {
  const [query, setQuery] = useUrlQuery(DEFAULTS)
  const dialog = useActionDialog()
  // Oldest first, so applications are handled in order.
  const params = useMemo(() => ({ sort: 'createdAt,asc', page: query.page, size: query.size }), [query.page, query.size])
  const { items, pageInfo, status, error, reload } = usePagedList(adminLists.pendingMerchants, params)
  const name = (u) => [u.firstName, u.lastName].filter(Boolean).join(' ') || u.email

  const columns = [
    {
      key: 'name',
      header: 'Applicant',
      primary: true,
      render: (u) => (
        <Link to={`/admin/users/${u.publicId}`} onClick={(e) => e.stopPropagation()} className="font-medium text-slate-900 hover:text-primary-700 dark:text-white">
          {name(u)}
        </Link>
      ),
    },
    { key: 'email', header: 'Email' },
    { key: 'nic', header: 'NIC', render: (u) => <span className="font-mono">{maskNic(u.nic)}</span> },
    { key: 'phone', header: 'Phone' },
    { key: 'applicationAttempts', header: 'Attempt', className: 'tabular-nums' },
    { key: 'createdAt', header: 'Applied', className: 'whitespace-nowrap', render: (u) => formatDate(u.createdAt) },
    {
      key: 'actions',
      header: <span className="sr-only">Actions</span>,
      render: (u) => (
        <span className="flex gap-2">
          <Button size="sm" variant="success" leftIcon={Check} onClick={() => dialog.open('approve', u)}>
            Approve
          </Button>
          <Button size="sm" variant="outline" leftIcon={X} onClick={() => dialog.open('reject', u)}>
            Reject
          </Button>
        </span>
      ),
    },
  ]

  return (
    <>
      <PageHeader title="Merchant approvals" description="New merchants waiting for a decision, oldest first." />
      <FormAlert tone="info" className="mb-4">
        The backend does not return the business name or the submitted documents on this list, so they cannot be shown here. Decide from the
        account details, or contact the applicant.
      </FormAlert>
      <Card className="p-4 sm:p-5">
        <AsyncContent
          status={status}
          error={error}
          onRetry={reload}
          isEmpty={items.length === 0}
          empty={<EmptyState icon={UserCheck} title="No applications waiting" description="New merchant applications appear here." />}
        >
          <Table columns={columns} rows={items} caption="Pending merchants" />
          <Pagination
            {...pageInfo}
            sizeOptions={ADMIN_PAGE_SIZE_OPTIONS}
            onPageChange={(page) => setQuery({ page }, { resetPage: false })}
            onSizeChange={(size) => setQuery({ size })}
          />
        </AsyncContent>
      </Card>

      <ConfirmDialog
        open={dialog.isOpen('approve')}
        title="Approve this merchant?"
        message={dialog.target && `${name(dialog.target)} (${dialog.target.email}) can then make products live and add assistants.`}
        confirmLabel="Approve"
        reasonOptional
        reasonLabel="Note (optional)"
        error={dialog.error}
        onConfirm={dialog.run((note) => adminApi.approveMerchant(dialog.target.publicId, note || undefined), 'Merchant approved.', reload)}
        onCancel={dialog.close}
      />
      <ConfirmDialog
        open={dialog.isOpen('reject')}
        title="Reject this application?"
        message="The merchant sees your reason and can resubmit while they have attempts left."
        confirmLabel="Reject"
        tone="danger"
        requireReason
        reasonLabel="Reason (shown to the merchant)"
        error={dialog.error}
        onConfirm={dialog.run((reason) => adminApi.rejectMerchant(dialog.target.publicId, reason), 'Application rejected.', reload)}
        onCancel={dialog.close}
      />
    </>
  )
}
