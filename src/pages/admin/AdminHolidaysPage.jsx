import { useId, useMemo, useState } from 'react'
import { CalendarDays, Pencil, Plus, Trash2 } from 'lucide-react'
import * as adminApi from '@/api/admin'
import { adminLists } from '@/store/slices/adminLists'
import { HOLIDAY_NAME_MAX, HOLIDAY_TYPE_LABELS } from '@/config/admin'
import { ADMIN_PAGE_SIZE_OPTIONS } from '@/config/constants'
import { ENUMS } from '@/config/enums'
import { errorMessage } from '@/config/errorMessages'
import { useActionDialog } from '@/hooks/useActionDialog'
import { usePagedList } from '@/hooks/usePagedList'
import { useToast } from '@/hooks/useToast'
import { useUrlQuery } from '@/hooks/useUrlQuery'
import { formatPlainDate } from '@/utils/format'
import { splitApiError } from '@/utils/formErrors'
import { compactErrors } from '@/utils/validators'
import AsyncContent from '@/components/common/AsyncContent'
import FormAlert from '@/components/common/FormAlert'
import PageHeader from '@/components/common/PageHeader'
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
import StatusBadge from '@/components/ui/StatusBadge'
import Table from '@/components/ui/Table'

const DEFAULTS = { from: '', to: '', sort: 'date,asc', page: 0, size: 50 }
const DATE = /^\d{4}-\d{2}-\d{2}$/
const SORTS = [
  { value: 'date,asc', label: 'Date (earliest first)' },
  { value: 'date,desc', label: 'Date (latest first)' },
  { value: 'name,asc', label: 'Name' },
]
const THIS_YEAR = new Date().getFullYear()
const YEARS = Array.from({ length: 5 }, (_, i) => THIS_YEAR - 1 + i)

function HolidayForm({ holiday, onClose, onSaved }) {
  const formId = useId()
  const [form, setForm] = useState({ date: holiday?.date ?? '', name: holiday?.name ?? '', type: holiday?.type ?? 'PUBLIC' })
  const [errors, setErrors] = useState({})
  const [formMessage, setFormMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const set = (patch) => setForm((f) => ({ ...f, ...patch }))

  const submit = async (event) => {
    event.preventDefault()
    const next = compactErrors({ date: DATE.test(form.date) ? '' : 'Choose a date.', name: form.name.trim() ? '' : 'Name is required.' })
    setErrors(next)
    setFormMessage('')
    if (Object.keys(next).length) return
    // Plain dates (yyyy-MM-dd), no time zone.
    const body = { date: form.date, name: form.name.trim(), type: form.type }
    setBusy(true)
    try {
      if (holiday) await adminApi.updateHoliday(holiday.publicId, body)
      else await adminApi.createHoliday(body)
      onSaved(holiday ? 'Holiday saved.' : 'Holiday added.')
    } catch (err) {
      const { fieldErrors } = splitApiError(err)
      if (err?.code === 'HOLIDAY_DATE_TAKEN') fieldErrors.date = errorMessage(err)
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
      title={holiday ? 'Edit holiday' : 'Add a holiday'}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" form={formId} loading={busy}>
            Save holiday
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={submit} noValidate className="space-y-4">
        {formMessage && <FormAlert>{formMessage}</FormAlert>}
        <FormField label="Date" required error={errors.date}>
          <Input type="date" value={form.date} onChange={(e) => set({ date: e.target.value })} />
        </FormField>
        <FormField label="Name" required error={errors.name}>
          <Input value={form.name} onChange={(e) => set({ name: e.target.value })} maxLength={HOLIDAY_NAME_MAX} placeholder="Vesak Full Moon Poya Day" />
        </FormField>
        <FormField label="Type">
          <Select value={form.type} onChange={(e) => set({ type: e.target.value })} options={ENUMS.HolidayType.map((t) => ({ value: t, label: HOLIDAY_TYPE_LABELS[t] }))} />
        </FormField>
      </form>
    </Modal>
  )
}

export default function AdminHolidaysPage() {
  const toast = useToast()
  const dialog = useActionDialog()
  const [query, setQuery] = useUrlQuery(DEFAULTS)
  const [editing, setEditing] = useState(null)
  const params = useMemo(
    () => ({
      from: DATE.test(query.from) ? query.from : undefined,
      to: DATE.test(query.to) ? query.to : undefined,
      sort: SORTS.some((s) => s.value === query.sort) ? query.sort : DEFAULTS.sort,
      page: query.page,
      size: query.size,
    }),
    [query],
  )
  const { items, pageInfo, status, error, reload } = usePagedList(adminLists.holidays, params)
  const year = query.from.endsWith('-01-01') && query.to === `${query.from.slice(0, 4)}-12-31` ? query.from.slice(0, 4) : ''

  const columns = [
    { key: 'date', header: 'Date', primary: true, className: 'whitespace-nowrap', render: (h) => <span className="font-medium">{formatPlainDate(h.date)}</span> },
    { key: 'name', header: 'Name' },
    { key: 'type', header: 'Type', render: (h) => <StatusBadge value={h.type} type="HolidayType" label={HOLIDAY_TYPE_LABELS[h.type]} /> },
    {
      key: 'actions',
      header: <span className="sr-only">Actions</span>,
      render: (h) => (
        <span className="flex gap-1">
          <IconButton icon={Pencil} label={`Edit ${h.name}`} size="sm" onClick={() => setEditing(h)} />
          <IconButton icon={Trash2} label={`Delete ${h.name}`} size="sm" variant="danger" onClick={() => dialog.open('delete', h)} />
        </span>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        title="Holidays"
        description="Public holidays and Poya days. Order deadlines pause on these days."
        actions={
          <Button leftIcon={Plus} onClick={() => setEditing('new')}>
            Add holiday
          </Button>
        }
      />
      <Card className="space-y-4 p-4 sm:p-5">
        <div className="grid gap-3 sm:grid-cols-4">
          <Select
            aria-label="Year"
            value={year}
            onChange={(e) => setQuery(e.target.value ? { from: `${e.target.value}-01-01`, to: `${e.target.value}-12-31` } : { from: '', to: '' })}
            options={YEARS.map((y) => ({ value: String(y), label: String(y) }))}
            placeholder="Any year"
          />
          <Input type="date" aria-label="From" value={query.from} onChange={(e) => setQuery({ from: e.target.value })} />
          <Input type="date" aria-label="To" value={query.to} onChange={(e) => setQuery({ to: e.target.value })} />
          <Select aria-label="Sort holidays" value={params.sort} onChange={(e) => setQuery({ sort: e.target.value })} options={SORTS} />
        </div>
        <AsyncContent status={status} error={error} onRetry={reload} isEmpty={items.length === 0} empty={<EmptyState icon={CalendarDays} title="No holidays in this range" />}>
          <Table columns={columns} rows={items} caption="Holidays" />
          <Pagination
            {...pageInfo}
            sizeOptions={ADMIN_PAGE_SIZE_OPTIONS}
            onPageChange={(page) => setQuery({ page }, { resetPage: false })}
            onSizeChange={(size) => setQuery({ size })}
          />
        </AsyncContent>
      </Card>
      {editing !== null && (
        <HolidayForm
          holiday={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={(message) => {
            setEditing(null)
            toast.success(message)
            reload()
          }}
        />
      )}
      <ConfirmDialog
        open={dialog.isOpen('delete')}
        title="Delete this holiday?"
        message={dialog.target && `${dialog.target.name} on ${formatPlainDate(dialog.target.date)}. Deadlines will no longer pause on this day.`}
        confirmLabel="Delete"
        tone="danger"
        error={dialog.error}
        onConfirm={dialog.run(() => adminApi.deleteHoliday(dialog.target.publicId), 'Holiday deleted.', reload)}
        onCancel={dialog.close}
      />
    </>
  )
}
