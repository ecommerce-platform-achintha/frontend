import { useMemo, useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { ACTIVE_FILTER_OPTIONS } from '@/config/admin'
import { ADMIN_PAGE_SIZE_OPTIONS } from '@/config/constants'
import { errorMessage } from '@/config/errorMessages'
import { usePagedList } from '@/hooks/usePagedList'
import { usePermissions } from '@/hooks/usePermissions'
import { useToast } from '@/hooks/useToast'
import { useUrlQuery } from '@/hooks/useUrlQuery'
import AsyncContent from '@/components/common/AsyncContent'
import FormAlert from '@/components/common/FormAlert'
import PageHeader from '@/components/common/PageHeader'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import EmptyState from '@/components/ui/EmptyState'
import IconButton from '@/components/ui/IconButton'
import Modal from '@/components/ui/Modal'
import Pagination from '@/components/ui/Pagination'
import Select from '@/components/ui/Select'
import Table from '@/components/ui/Table'

const DEFAULTS = { active: '', page: 0, size: 50 }

/**
 * Delete with a fallback: when the item is in use (`inUseCode`), offer "Deactivate instead".
 * `deactivate(item)` and `remove(item)` are API calls.
 */
function DeleteDialog({ item, noun, inUseCode, remove, deactivate, onClose, onDone }) {
  const [inUse, setInUse] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const run = async (call, message) => {
    setBusy(true)
    setError('')
    try {
      await call(item)
      onDone(message)
    } catch (err) {
      if (err?.code === inUseCode) setInUse(true)
      else setError(errorMessage(err))
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
      title={inUse ? `This ${noun} is in use` : `Delete ${item.name} (${item.code})?`}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          {inUse ? (
            <Button loading={busy} onClick={() => run(deactivate, `${item.name} deactivated.`)}>
              Deactivate instead
            </Button>
          ) : (
            <Button variant="danger" loading={busy} onClick={() => run(remove, `${item.name} deleted.`)}>
              Delete
            </Button>
          )}
        </>
      }
    >
      {error && <FormAlert className="mb-3">{error}</FormAlert>}
      <p className="text-sm text-slate-600 dark:text-slate-300">
        {inUse
          ? `Stores use this ${noun}, so it cannot be deleted. Deactivating stops new use and keeps existing records.`
          : 'This cannot be undone.'}
      </p>
    </Modal>
  )
}

/**
 * Shared page for banks and couriers: read-only paged list (default size 50) with an active filter
 * for admins; create, edit and delete for the super admin.
 * `Form` gets { item, onClose, onSaved(message) }.
 */
export default function MasterDataPage({ title, description, noun, resource, columns, Form, remove, deactivate, inUseCode, sort }) {
  const toast = useToast()
  const { isSuperAdmin } = usePermissions()
  const [query, setQuery] = useUrlQuery(DEFAULTS)
  const [editing, setEditing] = useState(null) // null | 'new' | item
  const [deleting, setDeleting] = useState(null)
  const params = useMemo(() => ({ active: query.active || undefined, sort, page: query.page, size: query.size }), [query, sort])
  const { items, pageInfo, status, error, reload } = usePagedList(resource, params)

  const done = (message) => {
    setEditing(null)
    setDeleting(null)
    toast.success(message)
    reload()
  }

  const allColumns = isSuperAdmin
    ? [
        ...columns,
        {
          key: 'actions',
          header: <span className="sr-only">Actions</span>,
          render: (item) => (
            <span className="flex gap-1">
              <IconButton icon={Pencil} label={`Edit ${item.name}`} size="sm" onClick={() => setEditing(item)} />
              <IconButton icon={Trash2} label={`Delete ${item.name}`} size="sm" variant="danger" onClick={() => setDeleting(item)} />
            </span>
          ),
        },
      ]
    : columns

  return (
    <>
      <PageHeader
        title={title}
        description={isSuperAdmin ? description : `${description} Only the super admin can change this list.`}
        actions={
          isSuperAdmin && (
            <Button leftIcon={Plus} onClick={() => setEditing('new')}>
              New {noun}
            </Button>
          )
        }
      />
      <Card className="space-y-4 p-4 sm:p-5">
        <Select aria-label="Active filter" value={query.active} onChange={(e) => setQuery({ active: e.target.value })} options={ACTIVE_FILTER_OPTIONS.slice(1)} placeholder={ACTIVE_FILTER_OPTIONS[0].label} className="sm:w-56" />
        <AsyncContent status={status} error={error} onRetry={reload} isEmpty={items.length === 0} empty={<EmptyState title={`No ${noun}s`} />}>
          <Table columns={allColumns} rows={items} rowKey="code" caption={title} />
          <Pagination
            {...pageInfo}
            sizeOptions={ADMIN_PAGE_SIZE_OPTIONS}
            onPageChange={(page) => setQuery({ page }, { resetPage: false })}
            onSizeChange={(size) => setQuery({ size })}
          />
        </AsyncContent>
      </Card>
      {editing !== null && <Form item={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={done} />}
      {deleting && (
        <DeleteDialog
          key={deleting.code}
          item={deleting}
          noun={noun}
          inUseCode={inUseCode}
          remove={remove}
          deactivate={deactivate}
          onClose={() => setDeleting(null)}
          onDone={done}
        />
      )}
    </>
  )
}
