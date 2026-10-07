import { useId, useState } from 'react'
import { LIMITS, validateReason } from '@/utils/validators'
import Button from './Button'
import FormField from './FormField'
import Modal from './Modal'
import Textarea from './Textarea'

/**
 * Confirmation dialog. Used for every ban, reject, hide and resolve action.
 * With `requireReason`, the user must type 1 to 500 characters; onConfirm receives the trimmed reason.
 * onConfirm may return a promise: the button shows a spinner until it settles.
 * Throw (or reject) from onConfirm to keep the dialog open; pass the server message as `error`.
 */
export default function ConfirmDialog({
  open,
  onCancel,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'primary', // primary | danger
  requireReason = false,
  reasonLabel = 'Reason',
  reasonHint = 'Kept in the record. Up to 500 characters.',
  error,
}) {
  const formId = useId()
  const [reason, setReason] = useState('')
  const [reasonError, setReasonError] = useState('')
  const [busy, setBusy] = useState(false)

  const close = () => {
    if (busy) return
    setReason('')
    setReasonError('')
    onCancel?.()
  }

  const submit = async (event) => {
    event.preventDefault()
    if (requireReason) {
      const problem = validateReason(reason)
      setReasonError(problem)
      if (problem) return
    }
    setBusy(true)
    try {
      await onConfirm?.(requireReason ? reason.trim() : undefined)
      setReason('')
    } catch {
      // The caller shows the error (via `error` or a toast); keep the dialog open.
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title={title}
      size="sm"
      dismissible={!busy}
      footer={
        <>
          <Button variant="outline" onClick={close} disabled={busy}>
            {cancelLabel}
          </Button>
          <Button variant={tone === 'danger' ? 'danger' : 'primary'} type="submit" form={formId} loading={busy}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={submit} className="space-y-4" noValidate>
        {message && <div className="text-sm text-slate-600 dark:text-slate-300">{message}</div>}
        {requireReason && (
          <FormField label={reasonLabel} hint={reasonHint} error={reasonError} required>
            <Textarea
              value={reason}
              onChange={(e) => {
                setReason(e.target.value)
                if (reasonError) setReasonError('')
              }}
              maxLength={LIMITS.reason}
              rows={3}
            />
          </FormField>
        )}
        {error && (
          <p role="alert" className="rounded-lg bg-danger-50 px-3 py-2 text-sm text-danger-700 dark:bg-danger-500/10 dark:text-danger-300">
            {error}
          </p>
        )}
      </form>
    </Modal>
  )
}
