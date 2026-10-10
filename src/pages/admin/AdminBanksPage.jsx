import { useId, useState } from 'react'
import * as adminApi from '@/api/admin'
import { adminLists } from '@/store/slices/adminLists'
import { errorMessage } from '@/config/errorMessages'
import { splitApiError } from '@/utils/formErrors'
import { compactErrors, REGEX } from '@/utils/validators'
import MasterDataPage from '@/components/admin/MasterDataPage'
import FormAlert from '@/components/common/FormAlert'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import FormField from '@/components/ui/FormField'
import Input from '@/components/ui/Input'
import Modal from '@/components/ui/Modal'
import Switch from '@/components/ui/Switch'

const NAME_MAX = 100

const COLUMNS = [
  { key: 'code', header: 'Code', primary: true, render: (b) => <span className="font-mono font-medium">{b.code}</span> },
  { key: 'name', header: 'Name' },
  { key: 'active', header: 'Status', render: (b) => <Badge tone={b.active !== false ? 'success' : 'neutral'}>{b.active !== false ? 'Active' : 'Inactive'}</Badge> },
]

// SUPER ADMIN. The code is the bank's id and cannot change after creation.
function BankForm({ item, onClose, onSaved }) {
  const formId = useId()
  const [form, setForm] = useState({ code: item?.code ?? '', name: item?.name ?? '', active: item ? item.active !== false : true })
  const [errors, setErrors] = useState({})
  const [formMessage, setFormMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const set = (patch) => setForm((f) => ({ ...f, ...patch }))

  const submit = async (event) => {
    event.preventDefault()
    const next = compactErrors({
      code: item ? '' : REGEX.code.test(form.code) ? '' : 'Capital letter first, then capitals, digits or _ (2 to 20).',
      name: form.name.trim() ? '' : 'Name is required.',
    })
    setErrors(next)
    setFormMessage('')
    if (Object.keys(next).length) return
    setBusy(true)
    try {
      if (item) await adminApi.updateBank(item.code, { name: form.name.trim(), active: form.active })
      else await adminApi.createBank({ code: form.code, name: form.name.trim(), active: form.active })
      onSaved(item ? 'Bank saved.' : 'Bank created.')
    } catch (err) {
      const { fieldErrors } = splitApiError(err)
      if (err?.code === 'BANK_CODE_TAKEN') fieldErrors.code = errorMessage(err)
      setErrors(fieldErrors)
      if (!Object.keys(fieldErrors).length) setFormMessage(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open
      size="sm"
      onClose={onClose}
      dismissible={!busy}
      title={item ? `Edit ${item.code}` : 'New bank'}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" form={formId} loading={busy}>
            Save bank
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={submit} noValidate className="space-y-4">
        {formMessage && <FormAlert>{formMessage}</FormAlert>}
        <FormField label="Code" required={!item} error={errors.code} hint={item ? 'Codes cannot change.' : 'For example BOC. Cannot change later.'}>
          <Input value={form.code} onChange={(e) => set({ code: e.target.value.toUpperCase() })} disabled={Boolean(item)} maxLength={20} />
        </FormField>
        <FormField label="Name" required error={errors.name}>
          <Input value={form.name} onChange={(e) => set({ name: e.target.value })} maxLength={NAME_MAX} />
        </FormField>
        <Switch checked={form.active} onChange={(v) => set({ active: v })} label="Active" description="Inactive banks cannot be chosen for new accounts." />
      </form>
    </Modal>
  )
}

export default function AdminBanksPage() {
  return (
    <MasterDataPage
      title="Banks"
      description="Banks stores and customers can choose."
      noun="bank"
      resource={adminLists.banks}
      columns={COLUMNS}
      sort="code,asc"
      Form={BankForm}
      inUseCode="BANK_IN_USE"
      remove={(b) => adminApi.deleteBank(b.code)}
      deactivate={(b) => adminApi.updateBank(b.code, { name: b.name, active: false })}
    />
  )
}
