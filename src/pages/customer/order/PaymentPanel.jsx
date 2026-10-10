import { useEffect, useMemo, useState } from 'react'
import { useDispatch } from 'react-redux'
import { Landmark } from 'lucide-react'
import * as ordersApi from '@/api/orders'
import { ORDER_CHANGED_CODES, submitOrderPayment } from '@/store/slices/customerOrderSlice'
import { MAX_ATTACHMENTS } from '@/config/constants'
import { errorMessage } from '@/config/errorMessages'
import { useAsync } from '@/hooks/useAsync'
import { useIdempotencyKey } from '@/hooks/useIdempotencyKey'
import { useToast } from '@/hooks/useToast'
import { fieldErrorsToMap } from '@/api/client'
import { compactErrors, REGEX } from '@/utils/validators'
import { cn } from '@/utils/cn'
import FormAlert from '@/components/common/FormAlert'
import ShopperButton from '@/components/common/ShopperButton'
import CopyButton from '@/components/ui/CopyButton'
import ErrorState from '@/components/ui/ErrorState'
import FilePicker from '@/components/ui/FilePicker'
import FormField from '@/components/ui/FormField'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Skeleton from '@/components/ui/Skeleton'

// There is no customer endpoint listing banks, so "Other" takes a code typed by the customer.
const OTHER = '__other__'
const BANK_CODE_REGEX = /^[A-Z0-9][A-Z0-9_-]{0,19}$/

function validate(values) {
  const bankCode = values.bankChoice === OTHER ? values.otherBank.trim().toUpperCase() : values.bankChoice
  return compactErrors({
    referenceNumber: !values.referenceNumber.trim()
      ? 'Enter the reference from your bank slip or app.'
      : REGEX.paymentReference.test(values.referenceNumber)
        ? ''
        : 'Use letters, digits, spaces, / . _ or - (up to 60).',
    sourceBankCode: !bankCode ? 'Choose the bank you paid from.' : BANK_CODE_REGEX.test(bankCode) ? '' : 'Use the short bank code, for example BOC.',
    sourceAccountNumber: !values.sourceAccountNumber.trim()
      ? 'Enter the account you paid from.'
      : REGEX.depositorAccount.test(values.sourceAccountNumber.trim())
        ? ''
        : 'Use digits, spaces or dashes only.',
    storeBankAccountPublicId: values.storeBankAccountPublicId ? '' : 'Choose the store account you paid into.',
  })
}

/**
 * Bank transfer step: shows the store's accounts (FULL numbers: kept only in this component,
 * never in Redux, never logged) and the "I have paid" form.
 */
export default function PaymentPanel({ order }) {
  const dispatch = useDispatch()
  const toast = useToast()
  const idem = useIdempotencyKey()
  const { data, status, error, reload } = useAsync(() => ordersApi.getOrderBankAccounts(order.publicId), `${order.publicId}:${order.status}`)
  const accounts = useMemo(() => (Array.isArray(data) ? data : []), [data])

  const [values, setValues] = useState({
    referenceNumber: '',
    bankChoice: '',
    otherBank: '',
    sourceAccountNumber: '',
    storeBankAccountPublicId: '',
    attachmentKeys: [],
  })
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Pre-select when the store has a single account.
  useEffect(() => {
    if (accounts.length === 1) setValues((v) => (v.storeBankAccountPublicId ? v : { ...v, storeBankAccountPublicId: accounts[0].publicId }))
  }, [accounts])

  const bankOptions = useMemo(() => {
    const seen = new Map(accounts.map((a) => [a.bankCode, a.bankName]))
    return [...[...seen].map(([code, name]) => ({ value: code, label: `${name ?? code} (${code})` })), { value: OTHER, label: 'Other bank' }]
  }, [accounts])

  const set = (field, value) => {
    setValues((v) => ({ ...v, [field]: value }))
    if (errors[field]) setErrors((e) => ({ ...e, [field]: '' }))
  }

  const submit = async (event) => {
    event.preventDefault()
    setFormError('')
    const clientErrors = validate(values)
    setErrors(clientErrors)
    if (Object.keys(clientErrors).length) return

    const body = {
      referenceNumber: values.referenceNumber.trim(),
      sourceBankCode: values.bankChoice === OTHER ? values.otherBank.trim().toUpperCase() : values.bankChoice,
      sourceAccountNumber: values.sourceAccountNumber.trim(),
      storeBankAccountPublicId: values.storeBankAccountPublicId,
      attachmentKeys: values.attachmentKeys.length ? values.attachmentKeys : undefined,
    }
    // Same key while retrying the same payload after a network/5xx failure (see useIdempotencyKey).
    const idempotencyKey = idem.keyFor(body)
    setSubmitting(true)
    try {
      await dispatch(submitOrderPayment({ publicId: order.publicId, body, idempotencyKey })).unwrap()
      idem.settle()
      toast.success('Payment submitted. The store will verify it.')
    } catch (err) {
      idem.settle(err)
      if (ORDER_CHANGED_CODES.includes(err.code)) {
        toast.info(errorMessage(err))
        return
      }
      const fields = fieldErrorsToMap(err)
      setErrors(fields)
      // PAYMENT_REJECTED gets a neutral message: never hint who used the reference.
      if (!Object.keys(fields).length) setFormError(errorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  if (status === 'loading') return <Skeleton className="h-40 w-full" />
  if (status === 'failed') return <ErrorState error={error} onRetry={reload} title="Store bank accounts could not be loaded" />

  return (
    <div className="space-y-6">
      <div>
        <p className="mb-3 text-sm font-medium text-slate-800 dark:text-slate-200">Transfer the total to one of these accounts:</p>
        <ul className="grid gap-3 sm:grid-cols-2">
          {accounts.map((account) => (
            <li key={account.publicId} className="rounded-xl border border-slate-200 p-4 text-sm dark:border-slate-700">
              <p className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white">
                <Landmark aria-hidden="true" className="size-4 text-slate-400" />
                {account.bankName} <span className="font-normal text-slate-500">({account.bankCode})</span>
              </p>
              <p className="text-slate-500 dark:text-slate-400">{account.branch}</p>
              <p className="mt-2 text-slate-600 dark:text-slate-300">{account.accountName}</p>
              <p className="flex items-center gap-1 font-mono text-base font-semibold tracking-wide text-slate-900 dark:text-white">
                {account.accountNumber}
                <CopyButton value={account.accountNumber} label="Copy account number" />
              </p>
            </li>
          ))}
        </ul>
        {accounts.length === 0 && <p className="text-sm text-slate-500">The store has no active bank account. Please contact the store.</p>}
      </div>

      <form onSubmit={submit} noValidate className="space-y-4 rounded-xl bg-slate-50 p-4 sm:p-5 dark:bg-slate-800/50">
        <p className="font-semibold text-slate-900 dark:text-white">I have paid</p>
        {formError && <FormAlert>{formError}</FormAlert>}

        <fieldset>
          <legend className="mb-2 text-sm font-medium text-slate-800 dark:text-slate-200">Store account you paid into *</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {accounts.map((a) => (
              <label
                key={a.publicId}
                className={cn(
                  'flex cursor-pointer items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm dark:bg-slate-900',
                  values.storeBankAccountPublicId === a.publicId ? 'border-primary-500 ring-1 ring-primary-500' : 'border-slate-200 dark:border-slate-700',
                )}
              >
                <input
                  type="radio"
                  name="storeAccount"
                  checked={values.storeBankAccountPublicId === a.publicId}
                  onChange={() => set('storeBankAccountPublicId', a.publicId)}
                  className="accent-primary-600"
                />
                {a.bankCode} · …{String(a.accountNumber).slice(-4)}
              </label>
            ))}
          </div>
          {errors.storeBankAccountPublicId && <p className="mt-1 text-xs font-medium text-danger-600">{errors.storeBankAccountPublicId}</p>}
        </fieldset>

        <FormField label="Reference number" hint="From your bank slip or app." error={errors.referenceNumber} required>
          <Input value={values.referenceNumber} onChange={(e) => set('referenceNumber', e.target.value)} maxLength={62} autoComplete="off" />
        </FormField>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Bank you paid from" error={errors.sourceBankCode} required>
            <Select value={values.bankChoice} onChange={(e) => set('bankChoice', e.target.value)} placeholder="Choose" options={bankOptions} />
          </FormField>
          {values.bankChoice === OTHER && (
            <FormField label="Bank code" hint="Short code, for example BOC or HNB." error={errors.sourceBankCode}>
              <Input value={values.otherBank} onChange={(e) => set('otherBank', e.target.value.toUpperCase())} maxLength={20} autoComplete="off" />
            </FormField>
          )}
        </div>
        <FormField label="Account you paid from" error={errors.sourceAccountNumber} required>
          <Input
            inputMode="numeric"
            value={values.sourceAccountNumber}
            onChange={(e) => set('sourceAccountNumber', e.target.value)}
            maxLength={30}
            autoComplete="off"
          />
        </FormField>
        <FormField label="Receipt" hint={`Optional, up to ${MAX_ATTACHMENTS} files.`}>
          <FilePicker value={values.attachmentKeys} onChange={(keys) => set('attachmentKeys', keys)} maxFiles={MAX_ATTACHMENTS} folder="payments" accept="image/*,application/pdf" label="Add receipt" />
        </FormField>
        <ShopperButton type="submit" loading={submitting} fullWidth size="lg" disabled={accounts.length === 0}>
          Submit payment
        </ShopperButton>
      </form>
    </div>
  )
}
