import { useId, useState } from 'react'
import { LIMITS, validateReason } from '@/utils/validators'
import { cn } from '@/utils/cn'
import FormAlert from '@/components/common/FormAlert'
import Button from '@/components/ui/Button'
import FormField from '@/components/ui/FormField'
import Modal from '@/components/ui/Modal'
import Textarea from '@/components/ui/Textarea'

/**
 * A choice plus a required note: resolve an order, decide a complaint or COD objection,
 * review a flagged reference. options: [{ value, label, description }].
 * onConfirm(choice, note) may throw to keep the dialog open; pass the message as `error`.
 * Mount it only while open, so each opening starts empty.
 */
export default function DecisionDialog({
  title,
  description,
  options,
  noteLabel = 'Note',
  noteHint = 'Kept in the record. Up to 500 characters.',
  confirmLabel = 'Confirm',
  error,
  children,
  onConfirm,
  onCancel,
}) {
  const formId = useId()
  const [choice, setChoice] = useState('')
  const [note, setNote] = useState('')
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)

  const submit = async (event) => {
    event.preventDefault()
    const next = {}
    if (!choice) next.choice = 'Choose one.'
    const noteProblem = validateReason(note)
    if (noteProblem) next.note = noteProblem
    setErrors(next)
    if (Object.keys(next).length) return
    setBusy(true)
    try {
      await onConfirm(choice, note.trim())
    } catch {
      // The caller shows the error; keep the dialog open.
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open
      onClose={onCancel}
      dismissible={!busy}
      title={title}
      description={description}
      footer={
        <>
          <Button variant="outline" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" form={formId} loading={busy} variant={choice === 'CANCEL' || choice === 'ESCALATED' ? 'danger' : 'primary'}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={submit} noValidate className="space-y-4">
        {error && <FormAlert>{error}</FormAlert>}
        {children}
        <fieldset>
          <legend className="text-sm font-medium text-slate-800 dark:text-slate-200">
            Decision<span className="ml-0.5 text-danger-600" aria-hidden="true">*</span>
          </legend>
          <div role="radiogroup" className="mt-2 grid gap-2">
            {options.map((o) => (
              <label
                key={o.value}
                className={cn(
                  'flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-sm',
                  choice === o.value ? 'border-primary-500 bg-primary-50 dark:bg-primary-500/10' : 'border-slate-200 dark:border-slate-700',
                )}
              >
                <input type="radio" name={formId} value={o.value} checked={choice === o.value} onChange={() => setChoice(o.value)} className="mt-1 accent-primary-600" />
                <span>
                  <span className="block font-semibold text-slate-900 dark:text-white">{o.label}</span>
                  <span className="text-slate-600 dark:text-slate-300">{o.description}</span>
                </span>
              </label>
            ))}
          </div>
          {errors.choice && (
            <p role="alert" className="mt-1 text-xs font-medium text-danger-600 dark:text-danger-400">
              {errors.choice}
            </p>
          )}
        </fieldset>
        <FormField label={noteLabel} required hint={noteHint} error={errors.note}>
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={LIMITS.reason} rows={3} />
        </FormField>
      </form>
    </Modal>
  )
}
