import { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { MapPin, Pencil, Plus, Trash2 } from 'lucide-react'
import * as usersApi from '@/api/users'
import {
  fetchAddresses,
  selectAddresses,
  selectAddressesError,
  selectAddressesPageInfo,
  selectAddressesStatus,
} from '@/store/slices/addressesSlice'
import { errorMessage } from '@/config/errorMessages'
import { useToast } from '@/hooks/useToast'
import { useUrlQuery } from '@/hooks/useUrlQuery'
import AddressForm from '@/components/address/AddressForm'
import AddressText from '@/components/address/AddressText'
import AsyncContent from '@/components/common/AsyncContent'
import PageHeader from '@/components/common/PageHeader'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import EmptyState from '@/components/ui/EmptyState'
import IconButton from '@/components/ui/IconButton'
import Modal from '@/components/ui/Modal'
import Pagination from '@/components/ui/Pagination'

const DEFAULTS = { page: 0, size: 20 }

export default function AddressesPage() {
  const dispatch = useDispatch()
  const toast = useToast()
  const [query, setQuery] = useUrlQuery(DEFAULTS)
  const items = useSelector(selectAddresses)
  const pageInfo = useSelector(selectAddressesPageInfo)
  const status = useSelector(selectAddressesStatus)
  const error = useSelector(selectAddressesError)
  // editing: null (closed) | 'new' | address object
  const [editing, setEditing] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [deleteError, setDeleteError] = useState('')

  const params = useMemo(() => ({ page: query.page, size: query.size, sort: 'updatedAt,desc' }), [query])
  const reload = () => dispatch(fetchAddresses(params))

  useEffect(() => {
    dispatch(fetchAddresses(params))
  }, [dispatch, params])

  const save = async (body) => {
    if (editing === 'new') await usersApi.createAddress(body)
    else await usersApi.updateAddress(editing.publicId, body)
    toast.success(editing === 'new' ? 'Address added.' : 'Address updated.')
    setEditing(null)
    reload()
  }

  const remove = async () => {
    setDeleteError('')
    try {
      await usersApi.deleteAddress(deleting.publicId)
      toast.success('Address deleted.')
      setDeleting(null)
      // Step back a page if we deleted the last item on it.
      if (items.length === 1 && query.page > 0) setQuery({ page: query.page - 1 }, { resetPage: false })
      else reload()
    } catch (err) {
      setDeleteError(errorMessage(err))
      throw err
    }
  }

  return (
    <>
      <PageHeader
        title="Addresses"
        description="Where your orders are delivered."
        actions={
          <Button leftIcon={Plus} onClick={() => setEditing('new')}>
            Add address
          </Button>
        }
      />

      <AsyncContent
        status={status}
        error={error}
        onRetry={reload}
        isEmpty={items.length === 0}
        empty={
          <Card>
            <EmptyState
              icon={MapPin}
              title="No saved addresses"
              description="Add an address to speed up checkout."
              action={
                <Button leftIcon={Plus} onClick={() => setEditing('new')}>
                  Add address
                </Button>
              }
            />
          </Card>
        }
      >
        <ul className="grid gap-4 sm:grid-cols-2">
          {items.map((address) => (
            <li key={address.publicId}>
              <Card className="flex h-full items-start justify-between gap-3 p-5">
                <AddressText address={address} />
                <div className="flex shrink-0 gap-1">
                  <IconButton icon={Pencil} label="Edit address" size="sm" onClick={() => setEditing(address)} />
                  <IconButton icon={Trash2} label="Delete address" size="sm" variant="danger" onClick={() => setDeleting(address)} />
                </div>
              </Card>
            </li>
          ))}
        </ul>
        <Pagination {...pageInfo} onPageChange={(page) => setQuery({ page }, { resetPage: false })} />
      </AsyncContent>

      <Modal open={editing !== null} onClose={() => setEditing(null)} title={editing === 'new' ? 'Add address' : 'Edit address'} size="lg">
        {editing !== null && (
          <AddressForm
            key={editing === 'new' ? 'new' : editing.publicId}
            address={editing === 'new' ? null : editing}
            onSubmit={save}
            onCancel={() => setEditing(null)}
          />
        )}
      </Modal>

      <ConfirmDialog
        open={deleting !== null}
        title="Delete this address?"
        message={deleting && <AddressText address={deleting} />}
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
