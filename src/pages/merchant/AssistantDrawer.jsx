import { useState } from 'react'
import * as usersApi from '@/api/users'
import { errorMessage } from '@/config/errorMessages'
import { PERM_LABELS } from '@/config/permissions'
import { useAsync } from '@/hooks/useAsync'
import { useToast } from '@/hooks/useToast'
import { formatDateTime } from '@/utils/format'
import FormAlert from '@/components/common/FormAlert'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import Drawer from '@/components/ui/Drawer'
import ErrorState from '@/components/ui/ErrorState'
import Skeleton from '@/components/ui/Skeleton'
import StatusBadge from '@/components/ui/StatusBadge'
import { PermissionChecklist } from './AssistantForms'

const ACTIONS = {
  ban: {
    title: 'Ban this assistant?',
    message: 'They cannot sign in until you unban them.',
    label: 'Ban assistant',
    tone: 'danger',
    call: usersApi.banAssistant,
    done: 'Assistant banned.',
  },
  unban: {
    title: 'Unban this assistant?',
    message: 'They can sign in again.',
    label: 'Unban assistant',
    tone: 'primary',
    call: usersApi.unbanAssistant,
    done: 'Assistant unbanned.',
  },
  remove: {
    title: 'Remove this assistant for good?',
    message: 'This is final: the account is closed and cannot be restored.',
    label: 'Remove assistant',
    tone: 'danger',
    call: usersApi.removeAssistant,
    done: 'Assistant removed.',
  },
}

const samePerms = (a, b) => a.length === b.length && a.every((p) => b.includes(p))

function PermissionsEditor({ assistant, onSaved }) {
  const toast = useToast()
  const saved = assistant.permissions ?? []
  const [value, setValue] = useState(saved)
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState('')

  const save = async () => {
    setError('')
    try {
      const result = await usersApi.updateAssistantPermissions(assistant.publicId, value)
      setConfirming(false)
      toast.success('Permissions saved. The assistant was signed out and sees the new access after signing in again.')
      onSaved(result)
    } catch (err) {
      setError(errorMessage(err))
      throw err
    }
  }

  return (
    <div className="space-y-3">
      <PermissionChecklist value={value} onChange={setValue} error={value.length ? '' : 'Keep at least one permission.'} />
      <div className="flex justify-end">
        <Button size="sm" disabled={!value.length || samePerms(value, saved)} onClick={() => setConfirming(true)}>
          Save permissions
        </Button>
      </div>
      <ConfirmDialog
        open={confirming}
        title="Change permissions?"
        message="The assistant is signed out on every device and has to sign in again to get the new access."
        confirmLabel="Save and sign them out"
        error={error}
        onConfirm={save}
        onCancel={() => {
          setConfirming(false)
          setError('')
        }}
      />
    </div>
  )
}

// Detail panel for one assistant: details (NIC masked by the server), permissions, ban/unban/remove.
export default function AssistantDrawer({ publicId, onClose, onChanged, readOnly }) {
  const toast = useToast()
  const { data: assistant, status, error, reload, setData } = useAsync(() => usersApi.getAssistant(publicId), publicId)
  const [action, setAction] = useState(null)
  const [actionError, setActionError] = useState('')

  const applied = (result) => {
    // Take the response if it is the assistant; otherwise read it again.
    if (result?.publicId === publicId) setData(result)
    else reload()
    onChanged()
  }

  const run = async (reason) => {
    setActionError('')
    try {
      const result = await ACTIONS[action].call(publicId, reason)
      toast.success(ACTIONS[action].done)
      setAction(null)
      applied(result)
    } catch (err) {
      // Unban can fail with 409 when the NIC is now used by another account: show the server's message.
      setActionError(errorMessage(err))
      throw err
    }
  }

  const s = assistant?.assistantStatus
  return (
    <Drawer open onClose={onClose} side="right" wide title="Assistant">
      <div className="space-y-6 p-4">
        {status === 'failed' ? (
          <ErrorState error={error} onRetry={reload} />
        ) : !assistant ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <>
            <div>
              <p className="text-lg font-semibold text-slate-900 dark:text-white">
                {assistant.firstName} {assistant.lastName}
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400">{assistant.email}</p>
              <div className="mt-2">
                <StatusBadge value={s} type="AssistantStatus" />
              </div>
            </div>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-xs text-slate-500 dark:text-slate-400">NIC</dt>
                <dd className="font-mono">{assistant.nic ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500 dark:text-slate-400">Phone</dt>
                <dd>{assistant.phone ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500 dark:text-slate-400">Added</dt>
                <dd>{formatDateTime(assistant.createdAt)}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500 dark:text-slate-400">ID</dt>
                <dd className="font-mono text-xs">{assistant.publicId}</dd>
              </div>
            </dl>
            {assistant.statusReason && <FormAlert tone="info" title="Reason">{assistant.statusReason}</FormAlert>}

            <section>
              <h3 className="mb-2 text-sm font-semibold text-slate-900 dark:text-white">Permissions</h3>
              {readOnly || s === 'REMOVED' ? (
                <ul className="flex flex-wrap gap-1.5">
                  {(assistant.permissions ?? []).map((p) => (
                    <li key={p}>
                      <Badge tone="primary">{PERM_LABELS[p] ?? p}</Badge>
                    </li>
                  ))}
                </ul>
              ) : (
                <PermissionsEditor key={(assistant.permissions ?? []).join()} assistant={assistant} onSaved={applied} />
              )}
            </section>

            {!readOnly && s !== 'REMOVED' && (
              <section className="space-y-2 border-t border-slate-100 pt-4 dark:border-slate-800">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Access</h3>
                {s === 'BANNED_BY_ADMIN' && (
                  <p className="text-sm text-slate-500 dark:text-slate-400">The marketplace team banned this assistant. Only they can lift it.</p>
                )}
                <div className="flex flex-wrap gap-2">
                  {s === 'ACTIVE' && (
                    <Button variant="outline" size="sm" onClick={() => setAction('ban')}>
                      Ban
                    </Button>
                  )}
                  {s === 'BANNED_BY_MERCHANT' && (
                    <Button variant="outline" size="sm" onClick={() => setAction('unban')}>
                      Unban
                    </Button>
                  )}
                  <Button variant="danger" size="sm" onClick={() => setAction('remove')}>
                    Remove for good
                  </Button>
                </div>
              </section>
            )}
          </>
        )}
      </div>
      <ConfirmDialog
        open={action !== null}
        title={ACTIONS[action]?.title}
        message={ACTIONS[action]?.message}
        confirmLabel={ACTIONS[action]?.label}
        tone={ACTIONS[action]?.tone}
        requireReason
        error={actionError}
        onConfirm={run}
        onCancel={() => {
          setAction(null)
          setActionError('')
        }}
      />
    </Drawer>
  )
}
