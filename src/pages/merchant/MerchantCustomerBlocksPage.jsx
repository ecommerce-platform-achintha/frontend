import { useId, useMemo, useState } from 'react'
import { UserCheck, UserX } from 'lucide-react'
import * as ordersApi from '@/api/orders'
import { merchantLists } from '@/store/slices/merchantLists'
import { PAGE_SIZE_OPTIONS } from '@/config/constants'
import { errorMessage } from '@/config/errorMessages'
import { useMerchantStatus } from '@/hooks/useMerchantStatus'
import { usePagedList } from '@/hooks/usePagedList'
import { useToast } from '@/hooks/useToast'
import { useUrlQuery } from '@/hooks/useUrlQuery'
import { formatDateTime } from '@/utils/format'
import { isPublicId, normalizePublicId } from '@/utils/ids'
import { LIMITS, validateReason } from '@/utils/validators'
import AsyncContent from '@/components/common/AsyncContent'
import FormAlert from '@/components/common/FormAlert'
import PageHeader from '@/components/common/PageHeader'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import EmptyState from '@/components/ui/EmptyState'
import FormField from '@/components/ui/FormField'
import Input from '@/components/ui/Input'
import Modal from '@/components/ui/Modal'
import Pagination from '@/components/ui/Pagination'
import Table from '@/components/ui/Table'
import Textarea from '@/components/ui/Textarea'

const DEFAULTS = { page: 0, size: 20 }

// Customers are identified by order data; this form accepts a customer id copied from an order.
function BlockForm({ onClose, onDone }) {
  const formId = useId()
  const [customerPublicId, setCustomerPublicId] = useState('')
  const [reason, setReason] = useState('')
  const [errors, setErrors] = useState({})
  const [formMessage, setFormMessage] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (event) => {
    event.preventDefault()
    const id = normalizePublicId(customerPublicId)
    const next = {}
    if (!isPublicId(id, 'USR')) next.customerPublicId = 'Enter a customer id like USR-2610-7K2M9Q.'
    const r = validateReason(reason)
    if (r) next.reason = r
    setErrors(next)
    setFormMessage('')
    if (Object.keys(next).length) return
    setBusy(true)
    try {
      await ordersApi.blockCustomer({ customerPublicId: id, reason: reason.trim() })
      onDone()
    } catch (err) {
      setFormMessage(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      dismissible={!busy}
      size="sm"
      title="Block a customer"
      description="The customer must have ordered from your store. You can find their id on the order page, or block them from there."
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" form={formId} variant="danger" loading={busy}>
            Block customer
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={submit} noValidate className="space-y-4">
        {formMessage && <FormAlert>{formMessage}</FormAlert>}
        <FormField label="Customer id" required error={errors.customerPublicId}>
          <Input value={customerPublicId} onChange={(e) => setCustomerPublicId(e.target.value)} placeholder="USR-…" autoComplete="off" spellCheck={false} />
        </FormField>
        <FormField label="Reason" required error={errors.reason} hint="Kept in the record. Up to 500 characters.">
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} maxLength={LIMITS.reason} rows={3} />
        </FormField>
      </form>
    </Modal>
  )
}

/*
 * The contract lists the block endpoints but not the item fields. We show customerPublicId,
 * reason, blockedBy (or blockedByPublicId) and createdAt when present.
 */
export default function MerchantCustomerBlocksPage() {
  const toast = useToast()
  const { readOnly } = useMerchantStatus()
  const [query, setQuery] = useUrlQuery(DEFAULTS)
  const [adding, setAdding] = useState(false)
  const [unblocking, setUnblocking] = useState(null)
  const [unblockError, setUnblockError] = useState('')
  // No sort is sent: the contract lists no sort fields for this list (an unknown one is a 400).
  const params = useMemo(() => ({ page: query.page, size: query.size }), [query])
  const { items, pageInfo, status, error, reload } = usePagedList(merchantLists.customerBlocks, params)

  const columns = [
    { key: 'customerPublicId', header: 'Customer', primary: true, render: (b) => <span className="font-mono font-medium">{b.customerPublicId}</span> },
    { key: 'reason', header: 'Reason', render: (b) => <span className="line-clamp-2 whitespace-normal">{b.reason || '—'}</span> },
    { key: 'blockedBy', header: 'Blocked by', render: (b) => b.blockedByName ?? b.blockedBy ?? b.blockedByPublicId ?? '—' },
    { key: 'createdAt', header: 'Date', className: 'whitespace-nowrap', render: (b) => formatDateTime(b.createdAt) },
  ]
  if (!readOnly) {
    columns.push({
      key: 'actions',
      header: <span className="sr-only">Actions</span>,
      render: (b) => (
        <Button variant="outline" size="sm" leftIcon={UserCheck} onClick={() => setUnblocking(b)}>
          Unblock
        </Button>
      ),
    })
  }

  const unblock = async (reason) => {
    setUnblockError('')
    try {
      await ordersApi.unblockCustomer(unblocking.customerPublicId, reason || undefined)
      setUnblocking(null)
      toast.success('Customer unblocked.')
      if (items.length === 1 && query.page > 0) setQuery({ page: query.page - 1 }, { resetPage: false })
      else reload()
    } catch (err) {
      setUnblockError(errorMessage(err))
      throw err
    }
  }

  return (
    <>
      <PageHeader
        title="Blocked customers"
        description="Blocked customers cannot place orders with your store."
        actions={
          !readOnly && (
            <Button variant="outline" leftIcon={UserX} onClick={() => setAdding(true)}>
              Block a customer
            </Button>
          )
        }
      />
      <Card className="p-4 sm:p-5">
        <AsyncContent
          status={status}
          error={error}
          onRetry={reload}
          isEmpty={items.length === 0}
          empty={<EmptyState icon={UserCheck} title="Nobody is blocked" description="You can block a customer from one of their orders." />}
        >
          <Table columns={columns} rows={items} rowKey="customerPublicId" caption="Blocked customers" />
          <Pagination
            {...pageInfo}
            sizeOptions={PAGE_SIZE_OPTIONS}
            onPageChange={(page) => setQuery({ page }, { resetPage: false })}
            onSizeChange={(size) => setQuery({ size })}
          />
        </AsyncContent>
      </Card>

      {adding && (
        <BlockForm
          onClose={() => setAdding(false)}
          onDone={() => {
            setAdding(false)
            toast.success('Customer blocked.')
            reload()
          }}
        />
      )}
      <ConfirmDialog
        open={unblocking !== null}
        title="Unblock this customer?"
        message={unblocking && `${unblocking.customerPublicId} will be able to order from your store again.`}
        confirmLabel="Unblock"
        reasonOptional
        reasonLabel="Reason (optional)"
        error={unblockError}
        onConfirm={unblock}
        onCancel={() => {
          setUnblocking(null)
          setUnblockError('')
        }}
      />
    </>
  )
}
