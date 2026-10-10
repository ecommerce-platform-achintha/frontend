import { useId, useMemo, useState } from 'react'
import { Plus, ShieldCheck } from 'lucide-react'
import * as adminApi from '@/api/admin'
import { adminLists } from '@/store/slices/adminLists'
import { ADMIN_PAGE_SIZE_OPTIONS } from '@/config/constants'
import { errorMessage } from '@/config/errorMessages'
import { ROLES } from '@/config/permissions'
import { useActionDialog } from '@/hooks/useActionDialog'
import { usePagedList } from '@/hooks/usePagedList'
import { useToast } from '@/hooks/useToast'
import { useUrlQuery } from '@/hooks/useUrlQuery'
import { formatDate } from '@/utils/format'
import { splitApiError } from '@/utils/formErrors'
import { compactErrors, LIMITS, normalizePhone, validateEmail, validateName, validateNic, validatePassword, validatePhone } from '@/utils/validators'
import UserStatusBadge from '@/components/admin/UserStatusBadge'
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
import PasswordInput from '@/components/ui/PasswordInput'
import Table from '@/components/ui/Table'

const DEFAULTS = { page: 0, size: 20 }
const EMPTY = { email: '', firstName: '', lastName: '', nic: '', phone: '', temporaryPassword: '' }

function CreateAdminForm({ onClose, onCreated }) {
  const formId = useId()
  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [formMessage, setFormMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const bind = (name) => ({ value: form[name], onChange: (e) => setForm((f) => ({ ...f, [name]: e.target.value })) })

  const submit = async (event) => {
    event.preventDefault()
    const next = compactErrors({
      email: validateEmail(form.email),
      firstName: validateName(form.firstName, 'First name'),
      lastName: validateName(form.lastName, 'Last name'),
      nic: validateNic(form.nic),
      phone: validatePhone(form.phone),
      temporaryPassword: validatePassword(form.temporaryPassword),
    })
    setErrors(next)
    setFormMessage('')
    if (Object.keys(next).length) return
    setBusy(true)
    try {
      await adminApi.createAdmin({
        email: form.email.trim(),
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        nic: form.nic.trim(),
        phone: normalizePhone(form.phone),
        temporaryPassword: form.temporaryPassword,
      })
      onCreated()
    } catch (err) {
      const { fieldErrors } = splitApiError(err)
      if (err?.code === 'EMAIL_ALREADY_EXISTS') fieldErrors.email = errorMessage(err)
      if (err?.code === 'NIC_ALREADY_ASSIGNED') fieldErrors.nic = errorMessage(err)
      setErrors(fieldErrors)
      if (!Object.keys(fieldErrors).length) setFormMessage(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open
      size="lg"
      onClose={onClose}
      dismissible={!busy}
      title="New admin"
      description="Admins run the marketplace: approvals, bans, disputes and master data."
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" form={formId} loading={busy}>
            Create admin
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={submit} noValidate className="space-y-4" autoComplete="off">
        {formMessage && <FormAlert>{formMessage}</FormAlert>}
        <FormField label="Email" required error={errors.email}>
          <Input {...bind('email')} type="email" maxLength={LIMITS.email} autoComplete="off" />
        </FormField>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="First name" required error={errors.firstName}>
            <Input {...bind('firstName')} maxLength={LIMITS.name} />
          </FormField>
          <FormField label="Last name" required error={errors.lastName}>
            <Input {...bind('lastName')} maxLength={LIMITS.name} />
          </FormField>
          <FormField label="NIC" required error={errors.nic}>
            <Input {...bind('nic')} maxLength={12} autoComplete="off" />
          </FormField>
          <FormField label="Phone" required error={errors.phone} hint="For example +94771234567.">
            <Input {...bind('phone')} type="tel" autoComplete="off" />
          </FormField>
        </div>
        <FormField label="Temporary password" required error={errors.temporaryPassword} hint="Share it privately. The new admin must change it the first time they sign in.">
          <PasswordInput {...bind('temporaryPassword')} showChecklist autoComplete="new-password" maxLength={LIMITS.passwordMax} />
        </FormField>
      </form>
    </Modal>
  )
}

export default function AdminAdminsPage() {
  const toast = useToast()
  const dialog = useActionDialog()
  const [query, setQuery] = useUrlQuery(DEFAULTS)
  const [creating, setCreating] = useState(false)
  const params = useMemo(() => ({ page: query.page, size: query.size }), [query])
  const { items, pageInfo, status, error, reload } = usePagedList(adminLists.admins, params)
  // The super admin account never appears here (also filtered client-side, in case the API returns it).
  const rows = items.filter((a) => a.role !== ROLES.SUPER_ADMIN)
  const banned = (a) => a.status === 'BANNED'

  const columns = [
    {
      key: 'name',
      header: 'Admin',
      primary: true,
      render: (a) => (
        <span>
          <span className="font-medium text-slate-900 dark:text-white">{[a.firstName, a.lastName].filter(Boolean).join(' ')}</span>
          <span className="block text-xs font-normal text-slate-500">{a.email}</span>
        </span>
      ),
    },
    { key: 'status', header: 'Status', render: (a) => <UserStatusBadge status={a.status} /> },
    { key: 'createdAt', header: 'Created', className: 'whitespace-nowrap', render: (a) => formatDate(a.createdAt) },
    {
      key: 'actions',
      header: <span className="sr-only">Actions</span>,
      render: (a) => (
        <Button size="sm" variant={banned(a) ? 'outline' : 'danger'} onClick={() => dialog.open(banned(a) ? 'unban' : 'ban', a)}>
          {banned(a) ? 'Unban' : 'Ban'}
        </Button>
      ),
    },
  ]

  const isBan = dialog.action === 'ban'
  return (
    <>
      <PageHeader
        title="Admins"
        description="Accounts that run the marketplace."
        actions={
          <Button leftIcon={Plus} onClick={() => setCreating(true)}>
            New admin
          </Button>
        }
      />
      <Card className="p-4 sm:p-5">
        <AsyncContent status={status} error={error} onRetry={reload} isEmpty={rows.length === 0} empty={<EmptyState icon={ShieldCheck} title="No admins yet" />}>
          <Table columns={columns} rows={rows} caption="Admins" />
          <Pagination
            {...pageInfo}
            sizeOptions={ADMIN_PAGE_SIZE_OPTIONS}
            onPageChange={(page) => setQuery({ page }, { resetPage: false })}
            onSizeChange={(size) => setQuery({ size })}
          />
        </AsyncContent>
      </Card>
      {creating && (
        <CreateAdminForm
          onClose={() => setCreating(false)}
          onCreated={() => {
            setCreating(false)
            toast.success('Admin created. Share the temporary password privately.')
            reload()
          }}
        />
      )}
      <ConfirmDialog
        open={dialog.action !== null}
        title={isBan ? 'Ban this admin?' : 'Unban this admin?'}
        message={isBan ? 'A banned admin cannot sign in. The reason is shown to them when they try.' : 'They can sign in again.'}
        confirmLabel={isBan ? 'Ban admin' : 'Unban admin'}
        tone={isBan ? 'danger' : 'primary'}
        requireReason
        reasonLabel={isBan ? 'Reason (shown to the admin)' : 'Reason'}
        error={dialog.error}
        onConfirm={dialog.run(
          (reason) => (isBan ? adminApi.banAdmin : adminApi.unbanAdmin)(dialog.target.publicId, reason),
          isBan ? 'Admin banned.' : 'Admin unbanned.',
          reload,
        )}
        onCancel={dialog.close}
      />
    </>
  )
}
