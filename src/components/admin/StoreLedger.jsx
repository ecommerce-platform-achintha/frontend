import { useState } from 'react'
import { Coins } from 'lucide-react'
import * as adminApi from '@/api/admin'
import { LEDGER_TYPE_LABELS } from '@/config/admin'
import { ADMIN_PAGE_SIZE_OPTIONS } from '@/config/constants'
import { errorMessage } from '@/config/errorMessages'
import { usePagedRequest } from '@/hooks/usePagedRequest'
import { useToast } from '@/hooks/useToast'
import { formatDateTime, formatMoney } from '@/utils/format'
import { LIMITS, validateMoney, validateReason } from '@/utils/validators'
import AsyncContent from '@/components/common/AsyncContent'
import FormAlert from '@/components/common/FormAlert'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import EmptyState from '@/components/ui/EmptyState'
import FormField from '@/components/ui/FormField'
import MoneyInput from '@/components/ui/MoneyInput'
import Pagination from '@/components/ui/Pagination'
import StatusBadge from '@/components/ui/StatusBadge'
import Table from '@/components/ui/Table'
import Textarea from '@/components/ui/Textarea'

const COLUMNS = [
  { key: 'type', header: 'Type', primary: true, render: (e) => <StatusBadge value={e.type} type="LedgerEntryType" label={LEDGER_TYPE_LABELS[e.type]} /> },
  { key: 'amount', header: 'Amount', className: 'tabular-nums whitespace-nowrap', render: (e) => formatMoney(e.amount) },
  { key: 'orderPublicId', header: 'Order', render: (e) => e.orderPublicId ?? '—' },
  { key: 'description', header: 'Description', render: (e) => <span className="whitespace-normal">{e.description ?? e.reason ?? '—'}</span> },
  { key: 'createdAt', header: 'Date', className: 'whitespace-nowrap', render: (e) => formatDateTime(e.createdAt) },
]

function GrantCredit({ storePublicId, onGranted }) {
  const toast = useToast()
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')
  const [errors, setErrors] = useState({})
  const [formMessage, setFormMessage] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (event) => {
    event.preventDefault()
    const next = {}
    const a = validateMoney(amount)
    if (a) next.amount = a
    const r = validateReason(reason)
    if (r) next.reason = r
    setErrors(next)
    setFormMessage('')
    if (Object.keys(next).length) return
    setBusy(true)
    try {
      await adminApi.addMerchantCredit(storePublicId, { amount: Number(amount), reason: reason.trim() })
      toast.success('Credit granted.')
      setAmount('')
      setReason('')
      onGranted()
    } catch (err) {
      setFormMessage(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-3">
      {formMessage && <FormAlert>{formMessage}</FormAlert>}
      <FormField label="Amount" required error={errors.amount} hint="More than 0, up to 2 decimals.">
        <MoneyInput value={amount} onChange={setAmount} />
      </FormField>
      <FormField label="Reason" required error={errors.reason}>
        <Textarea value={reason} onChange={(e) => setReason(e.target.value)} maxLength={LIMITS.reason} rows={2} />
      </FormField>
      <Button type="submit" loading={busy} leftIcon={Coins}>
        Grant credit
      </Button>
    </form>
  )
}

// SUPER ADMIN: a store's fee ledger and the "Grant credit" form.
export default function StoreLedger({ storePublicId }) {
  const [paging, setPaging] = useState({ page: 0, size: 20 })
  const ledger = usePagedRequest((p) => adminApi.getMerchantLedger(storePublicId, p), paging, storePublicId)
  // The ledger response is { balance, enforced, entries: <page> }.
  const entries = ledger.data?.entries
  const pageInfo = entries ? { page: entries.page, size: entries.size, totalElements: entries.totalElements, totalPages: entries.totalPages } : ledger.pageInfo

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
      <Card>
        <Card.Header
          title="Ledger"
          description={
            ledger.data && (
              <span className="flex flex-wrap items-center gap-2">
                Balance <span className="font-semibold text-slate-900 tabular-nums dark:text-white">{formatMoney(ledger.data.balance)}</span>
                {ledger.data.enforced === false && <Badge tone="info">Fees recorded, not charged</Badge>}
              </span>
            )
          }
        />
        <Card.Body className="pt-3">
          <AsyncContent
            status={ledger.status}
            error={ledger.error}
            onRetry={ledger.reload}
            isEmpty={(entries?.content ?? []).length === 0}
            empty={<EmptyState icon={Coins} title="No entries yet" />}
          >
            <Table columns={COLUMNS} rows={entries?.content ?? []} rowKey={(e) => `${e.type}-${e.createdAt}-${e.amount}`} caption="Ledger entries" />
            <Pagination
              {...pageInfo}
              sizeOptions={ADMIN_PAGE_SIZE_OPTIONS}
              onPageChange={(page) => setPaging((p) => ({ ...p, page }))}
              onSizeChange={(size) => setPaging({ page: 0, size })}
            />
          </AsyncContent>
        </Card.Body>
      </Card>
      <Card>
        <Card.Header title="Grant credit" description="Adds a credit entry to this store’s ledger." />
        <Card.Body>
          <GrantCredit storePublicId={storePublicId} onGranted={ledger.reload} />
        </Card.Body>
      </Card>
    </div>
  )
}
