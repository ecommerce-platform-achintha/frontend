import { useMemo, useState } from 'react'
import { Plus, Users } from 'lucide-react'
import { merchantLists } from '@/store/slices/merchantLists'
import { PAGE_SIZE_OPTIONS } from '@/config/constants'
import { ASSISTANT_SORT } from '@/config/merchant'
import { PERM_LABELS } from '@/config/permissions'
import { useMerchantStatus } from '@/hooks/useMerchantStatus'
import { usePagedList } from '@/hooks/usePagedList'
import { useToast } from '@/hooks/useToast'
import { useUrlQuery } from '@/hooks/useUrlQuery'
import { formatDate } from '@/utils/format'
import { isPublicId } from '@/utils/ids'
import AsyncContent from '@/components/common/AsyncContent'
import PageHeader from '@/components/common/PageHeader'
import PermissionButton from '@/components/common/PermissionButton'
import Badge from '@/components/ui/Badge'
import Card from '@/components/ui/Card'
import EmptyState from '@/components/ui/EmptyState'
import Pagination from '@/components/ui/Pagination'
import StatusBadge from '@/components/ui/StatusBadge'
import Table from '@/components/ui/Table'
import AssistantDrawer from './AssistantDrawer'
import { CreateAssistantForm } from './AssistantForms'

const DEFAULTS = { assistant: '', page: 0, size: 20 }
const NOT_ACTIVE = 'Your account must be approved before adding assistants.'

const COLUMNS = [
  {
    key: 'name',
    header: 'Assistant',
    primary: true,
    render: (a) => (
      <span>
        <span className="font-medium text-slate-900 dark:text-white">
          {a.firstName} {a.lastName}
        </span>
        <span className="block text-xs font-normal text-slate-500">{a.email}</span>
      </span>
    ),
  },
  { key: 'assistantStatus', header: 'Status', render: (a) => <StatusBadge value={a.assistantStatus} type="AssistantStatus" /> },
  {
    key: 'permissions',
    header: 'Permissions',
    render: (a) => (
      <span className="flex flex-wrap gap-1 whitespace-normal">
        {(a.permissions ?? []).map((p) => (
          <Badge key={p} tone="primary">
            {PERM_LABELS[p] ?? p}
          </Badge>
        ))}
      </span>
    ),
  },
  { key: 'createdAt', header: 'Added', className: 'whitespace-nowrap', hideOnMobile: true, render: (a) => formatDate(a.createdAt) },
]

export default function MerchantAssistantsPage() {
  const toast = useToast()
  const { isPending, readOnly } = useMerchantStatus()
  const [query, setQuery] = useUrlQuery(DEFAULTS)
  const [creating, setCreating] = useState(false)
  const params = useMemo(() => ({ sort: ASSISTANT_SORT, page: query.page, size: query.size }), [query.page, query.size])
  const { items, pageInfo, status, error, reload } = usePagedList(merchantLists.assistants, params)
  const openId = isPublicId(query.assistant, 'USR') ? query.assistant : null

  const addButton = (
    <PermissionButton leftIcon={Plus} mode="disable" blockedReason={isPending ? NOT_ACTIVE : undefined} onClick={() => setCreating(true)}>
      Add assistant
    </PermissionButton>
  )

  return (
    <>
      <PageHeader title="Assistants" description="People who help run your store, each with only the access they need." actions={addButton} />
      <Card className="p-4 sm:p-5">
        <AsyncContent
          status={status}
          error={error}
          onRetry={reload}
          isEmpty={items.length === 0}
          empty={
            <EmptyState
              icon={Users}
              title="No assistants yet"
              description={isPending ? NOT_ACTIVE : 'Add someone to help with orders, products or reviews.'}
              action={!isPending && !readOnly && addButton}
            />
          }
        >
          <Table columns={COLUMNS} rows={items} caption="Assistants" onRowClick={(a) => setQuery({ assistant: a.publicId }, { resetPage: false })} />
          <Pagination
            {...pageInfo}
            sizeOptions={PAGE_SIZE_OPTIONS}
            onPageChange={(page) => setQuery({ page }, { resetPage: false })}
            onSizeChange={(size) => setQuery({ size })}
          />
        </AsyncContent>
      </Card>

      {creating && (
        <CreateAssistantForm
          onClose={() => setCreating(false)}
          onCreated={() => {
            setCreating(false)
            toast.success('Assistant created. Share the temporary password with them privately.')
            reload()
          }}
        />
      )}
      {openId && (
        <AssistantDrawer
          key={openId}
          publicId={openId}
          readOnly={readOnly}
          onClose={() => setQuery({ assistant: '' }, { resetPage: false, replace: true })}
          onChanged={reload}
        />
      )}
    </>
  )
}
