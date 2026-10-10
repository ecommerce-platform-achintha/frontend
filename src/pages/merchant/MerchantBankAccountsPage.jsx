import { useId, useMemo, useState } from 'react'
import { Landmark, Pencil, Plus, Trash2 } from 'lucide-react'
import * as storesApi from '@/api/stores'
import { merchantLists } from '@/store/slices/merchantLists'
import { errorMessage } from '@/config/errorMessages'
import { BANK_ACCOUNT_DIGITS } from '@/config/merchant'
import { useAsync } from '@/hooks/useAsync'
import { useMerchantStatus } from '@/hooks/useMerchantStatus'
import { usePagedList } from '@/hooks/usePagedList'
import { useToast } from '@/hooks/useToast'
import { useUrlQuery } from '@/hooks/useUrlQuery'
import { splitApiError } from '@/utils/formErrors'
import { compactErrors } from '@/utils/validators'
import AsyncContent from '@/components/common/AsyncContent'
import FormAlert from '@/components/common/FormAlert'
import PageHeader from '@/components/common/PageHeader'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import EmptyState from '@/components/ui/EmptyState'
import FormField from '@/components/ui/FormField'
import IconButton from '@/components/ui/IconButton'
import Input from '@/components/ui/Input'
import Modal from '@/components/ui/Modal'
import Pagination from '@/components/ui/Pagination'
import Select from '@/components/ui/Select'
import Switch from '@/components/ui/Switch'

const DEFAULTS = { page: 0, size: 20 }
const TEXT_MAX = 150

// "1234 5678-90" -> "1234567890" (the API wants digits only).
const digitsOnly = (value) => String(value ?? '').replace(/[\s-]/g, '')

function validate(form, isEdit) {
  const number = digitsOnly(form.accountNumber)
  let numberError = ''
  if (!number && !isEdit) numberError = 'Account number is required.'
  else if (number && (!/^\d+$/.test(number) || number.length < BANK_ACCOUNT_DIGITS.min || number.length > BANK_ACCOUNT_DIGITS.max))
    numberError = `Use ${BANK_ACCOUNT_DIGITS.min} to ${BANK_ACCOUNT_DIGITS.max} digits.`
  return compactErrors({
    bankCode: form.bankCode ? '' : 'Choose a bank.',
    branch: form.branch.trim() ? '' : 'Branch is required.',
    accountName: form.accountName.trim() ? '' : 'Account name is required.',
    accountNumber: numberError,
  })
}

/**
 * Add or edit a bank account. The full number lives only in this form's state while typing:
 * it is never logged, never stored in Redux, and the form unmounts after a save.
 * On edit an empty number keeps the current one (accountNumber is omitted).
 */
function BankAccountForm({ account, banks, onClose, onSaved }) {
  const formId = useId()
  const isEdit = Boolean(account)
  const [form, setForm] = useState({
    bankCode: account?.bankCode ?? '',
    branch: account?.branch ?? '',
    accountName: account?.accountName ?? '',
    accountNumber: '',
    active: account ? account.active !== false : true,
  })
  const [errors, setErrors] = useState({})
  const [formMessage, setFormMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const set = (patch) => setForm((f) => ({ ...f, ...patch }))

  const submit = async (event) => {
    event.preventDefault()
    const problems = validate(form, isEdit)
    setErrors(problems)
    setFormMessage('')
    if (Object.keys(problems).length) return
    const body = { bankCode: form.bankCode, branch: form.branch.trim(), accountName: form.accountName.trim(), active: form.active }
    const number = digitsOnly(form.accountNumber)
    if (number) body.accountNumber = number
    setBusy(true)
    try {
      if (isEdit) await storesApi.updateBankAccount(account.publicId, body)
      else await storesApi.createBankAccount(body)
      onSaved(isEdit ? 'Bank account updated.' : 'Bank account added.')
    } catch (err) {
      const { fieldErrors } = splitApiError(err)
      setErrors(fieldErrors)
      setFormMessage(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  // An inactive or removed bank stays selectable while editing an account that already uses it.
  const options = banks.map((b) => ({ value: b.code, label: `${b.name} (${b.code})` }))
  if (account?.bankCode && !options.some((o) => o.value === account.bankCode)) options.push({ value: account.bankCode, label: account.bankName ?? account.bankCode })

  return (
    <Modal
      open
      onClose={onClose}
      dismissible={!busy}
      title={isEdit ? 'Edit bank account' : 'Add a bank account'}
      description="Customers paying by bank transfer see these details."
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" form={formId} loading={busy}>
            {isEdit ? 'Save account' : 'Add account'}
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={submit} noValidate className="space-y-4" autoComplete="off">
        {formMessage && <FormAlert>{formMessage}</FormAlert>}
        <FormField label="Bank" required error={errors.bankCode}>
          <Select value={form.bankCode} onChange={(e) => set({ bankCode: e.target.value })} options={options} placeholder="Choose a bank" />
        </FormField>
        <FormField label="Branch" required error={errors.branch}>
          <Input value={form.branch} onChange={(e) => set({ branch: e.target.value })} maxLength={TEXT_MAX} />
        </FormField>
        <FormField label="Account name" required error={errors.accountName}>
          <Input value={form.accountName} onChange={(e) => set({ accountName: e.target.value })} maxLength={TEXT_MAX} />
        </FormField>
        <FormField
          label="Account number"
          required={!isEdit}
          error={errors.accountNumber}
          hint={isEdit ? `Current: ${account.accountNumberMasked}. Leave empty to keep it.` : 'Digits only; spaces and dashes are removed.'}
        >
          <Input value={form.accountNumber} onChange={(e) => set({ accountNumber: e.target.value })} inputMode="numeric" autoComplete="off" />
        </FormField>
        <Switch checked={form.active} onChange={(v) => set({ active: v })} label="Active" description="Only active accounts are shown to customers." />
      </form>
    </Modal>
  )
}

export default function MerchantBankAccountsPage() {
  const toast = useToast()
  const { readOnly } = useMerchantStatus()
  const [query, setQuery] = useUrlQuery(DEFAULTS)
  const [editing, setEditing] = useState(null) // null | 'new' | account
  const [deleting, setDeleting] = useState(null)
  const [deleteError, setDeleteError] = useState('')
  const params = useMemo(() => ({ page: query.page, size: query.size }), [query])
  const { items, pageInfo, status, error, reload } = usePagedList(merchantLists.bankAccounts, params)
  const banks = useAsync(() => storesApi.listAvailableBanks(), 'banks')
  const bankList = Array.isArray(banks.data) ? banks.data : []
  const bankName = (code) => bankList.find((b) => b.code === code)?.name ?? code

  const remove = async () => {
    setDeleteError('')
    try {
      await storesApi.deleteBankAccount(deleting.publicId)
      setDeleting(null)
      toast.success('Bank account deleted.')
      if (items.length === 1 && query.page > 0) setQuery({ page: query.page - 1 }, { resetPage: false })
      else reload()
    } catch (err) {
      setDeleteError(errorMessage(err))
      throw err
    }
  }

  const addButton = !readOnly && (
    <Button leftIcon={Plus} onClick={() => setEditing('new')} disabled={banks.status === 'loading'}>
      Add bank account
    </Button>
  )

  return (
    <>
      <PageHeader title="Bank accounts" description="Where customers send bank transfers. Numbers are always shown masked." actions={addButton} />
      {banks.status === 'failed' && <FormAlert className="mb-4">Could not load the bank list: {errorMessage(banks.error)}</FormAlert>}
      <AsyncContent
        status={status}
        error={error}
        onRetry={reload}
        isEmpty={items.length === 0}
        empty={
          <Card>
            <EmptyState icon={Landmark} title="No bank accounts yet" description="Add at least one so customers can pay by bank transfer." action={addButton} />
          </Card>
        }
      >
        <ul className="grid gap-4 sm:grid-cols-2">
          {items.map((account) => (
            <li key={account.publicId}>
              <Card className="flex h-full items-start justify-between gap-3 p-5">
                <div className="min-w-0 text-sm">
                  <p className="font-semibold text-slate-900 dark:text-white">{account.bankName ?? bankName(account.bankCode)}</p>
                  <p className="font-mono text-slate-700 dark:text-slate-300">{account.accountNumberMasked}</p>
                  <p className="text-slate-500 dark:text-slate-400">
                    {account.accountName} · {account.branch}
                  </p>
                  <Badge tone={account.active !== false ? 'success' : 'neutral'} className="mt-2">
                    {account.active !== false ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                {!readOnly && (
                  <div className="flex shrink-0 gap-1">
                    <IconButton icon={Pencil} label="Edit bank account" size="sm" onClick={() => setEditing(account)} />
                    <IconButton icon={Trash2} label="Delete bank account" size="sm" variant="danger" onClick={() => setDeleting(account)} />
                  </div>
                )}
              </Card>
            </li>
          ))}
        </ul>
        <Pagination {...pageInfo} onPageChange={(page) => setQuery({ page }, { resetPage: false })} />
      </AsyncContent>

      {editing !== null && (
        <BankAccountForm
          account={editing === 'new' ? null : editing}
          banks={bankList.filter((b) => b.active !== false)}
          onClose={() => setEditing(null)}
          onSaved={(message) => {
            setEditing(null)
            toast.success(message)
            reload()
          }}
        />
      )}
      <ConfirmDialog
        open={deleting !== null}
        title="Delete this bank account?"
        message={deleting && `${deleting.bankName ?? bankName(deleting.bankCode)} ${deleting.accountNumberMasked} will no longer be offered to customers.`}
        confirmLabel="Delete"
        tone="danger"
        error={deleteError}
        onConfirm={remove}
        onCancel={() => {
          setDeleting(null)
          setDeleteError('')
        }}
      />
    </>
  )
}
