import { Link, useParams } from 'react-router-dom'
import { UserX } from 'lucide-react'
import * as adminApi from '@/api/admin'
import { PERM_LABELS, ROLE_LABELS, ROLES } from '@/config/permissions'
import { useActionDialog } from '@/hooks/useActionDialog'
import { useAsync } from '@/hooks/useAsync'
import { useToast } from '@/hooks/useToast'
import { formatDateTime } from '@/utils/format'
import CustomerScoreCard from '@/components/admin/CustomerScoreCard'
import UserStatusBadge from '@/components/admin/UserStatusBadge'
import PageHeader from '@/components/common/PageHeader'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import EmptyState from '@/components/ui/EmptyState'
import ErrorState from '@/components/ui/ErrorState'
import Skeleton from '@/components/ui/Skeleton'
import StatusBadge from '@/components/ui/StatusBadge'

// Every action an admin can take on a user, by key. `reasonLabel` says when the user sees the reason.
const ACTIONS = {
  banCustomer: {
    label: 'Ban customer',
    title: 'Ban this customer?',
    message: 'They can still sign in and see their orders, but cannot check out, confirm quotes or pay.',
    reasonLabel: 'Reason (shown to the customer)',
    tone: 'danger',
    call: adminApi.banCustomer,
    done: 'Customer banned.',
  },
  unbanCustomer: { label: 'Unban customer', title: 'Unban this customer?', message: 'They can shop again.', call: adminApi.unbanCustomer, done: 'Customer unbanned.' },
  approveMerchant: {
    label: 'Approve',
    title: 'Approve this merchant?',
    message: 'They can make products live and add assistants.',
    optional: true,
    reasonLabel: 'Note (optional)',
    call: (id, note) => adminApi.approveMerchant(id, note || undefined),
    done: 'Merchant approved.',
  },
  rejectMerchant: {
    label: 'Reject',
    title: 'Reject this application?',
    message: 'The merchant can resubmit while they have attempts left.',
    reasonLabel: 'Reason (shown to the merchant)',
    tone: 'danger',
    call: adminApi.rejectMerchant,
    done: 'Application rejected.',
  },
  banMerchant: {
    label: 'Ban merchant',
    title: 'Ban this merchant?',
    message: 'The ban starts with a silent grace period: the merchant still sees an active account until it ends. You can unban during that time.',
    reasonLabel: 'Reason (shown to the merchant)',
    tone: 'danger',
    call: adminApi.banMerchant,
    done: 'Merchant ban started.',
  },
  unbanMerchant: { label: 'Unban merchant', title: 'Unban this merchant?', message: 'The ban (or pending ban) is lifted.', call: adminApi.unbanMerchant, done: 'Merchant unbanned.' },
  assistantBan: {
    label: 'Ban for misconduct',
    title: 'Ban this assistant for misconduct?',
    message: 'This is permanent: the assistant’s NIC is blocked, so the same person cannot be added as an assistant by any store again.',
    reasonLabel: 'Reason',
    tone: 'danger',
    call: adminApi.assistantBan,
    done: 'Assistant banned.',
  },
}

// Which actions apply to a user (the backend is still the authority).
function actionsFor(user) {
  switch (user.role) {
    case ROLES.CUSTOMER:
      return user.status === 'BANNED' ? ['unbanCustomer'] : ['banCustomer']
    case ROLES.MERCHANT:
      if (user.status === 'PENDING_APPROVAL') return ['approveMerchant', 'rejectMerchant']
      if (user.status === 'ACTIVE') return ['banMerchant']
      if (user.status === 'BAN_GRACE' || user.status === 'BANNED') return ['unbanMerchant']
      return []
    case ROLES.ASSISTANT:
      return user.assistantStatus === 'BANNED_BY_ADMIN' || user.assistantStatus === 'REMOVED' ? [] : ['assistantBan']
    default:
      return [] // admin bans are a super-admin action on /admin/admins
  }
}

function Field({ label, children }) {
  return (
    <div>
      <dt className="text-xs text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className="mt-0.5 break-words">{children ?? '—'}</dd>
    </div>
  )
}

export default function AdminUserDetailPage() {
  const { publicId } = useParams()
  const toast = useToast()
  const dialog = useActionDialog()
  const { data: user, status, error, reload, setData } = useAsync(() => adminApi.getUser(publicId), publicId)

  if (status === 'failed') {
    return error?.status === 404 ? (
      <EmptyState icon={UserX} title="User not found" action={<Button to="/admin/users">All users</Button>} />
    ) : (
      <ErrorState error={error} onRetry={reload} />
    )
  }
  if (!user) return <Skeleton className="h-96 w-full" />

  const actions = actionsFor(user)
  const action = ACTIONS[dialog.action]
  const name = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email
  const applied = (result) => (result?.publicId === publicId ? setData(result) : reload())
  const onError = (err) => {
    // The status changed meanwhile: show the current one and say why nothing happened.
    if (err?.code === 'INVALID_STATUS_TRANSITION') {
      dialog.close()
      toast.warning('This account’s status changed in the meantime, so that action no longer applies. We reloaded it.')
      reload()
    }
  }

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: 'Users', to: '/admin/users' }, { label: name }]}
        title={
          <span className="flex flex-wrap items-center gap-3">
            {name}
            <UserStatusBadge status={user.status} />
          </span>
        }
        description={`${ROLE_LABELS[user.role] ?? user.role} · ${user.publicId}`}
        actions={actions.map((key) => (
          <Button key={key} variant={ACTIONS[key].tone === 'danger' ? 'danger' : 'outline'} onClick={() => dialog.open(key)}>
            {ACTIONS[key].label}
          </Button>
        ))}
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <Card>
          <Card.Header title="Account" />
          <Card.Body>
            <dl className="grid gap-4 text-sm sm:grid-cols-2">
              <Field label="Email">{user.email}</Field>
              <Field label="Phone">{user.phone}</Field>
              {/* Full NIC: only on this page, never in lists. */}
              <Field label="NIC">{user.nic && <span className="font-mono">{user.nic}</span>}</Field>
              <Field label="Created">{formatDateTime(user.createdAt)}</Field>
              <Field label="Status">
                <UserStatusBadge status={user.status} />
              </Field>
              <Field label="Status reason">{user.statusReason}</Field>
              <Field label="Status changed by">{user.statusChangedBy}</Field>
              <Field label="Status changed">{user.statusChangedAt && formatDateTime(user.statusChangedAt)}</Field>
              {(user.banEffectiveAt || user.status === 'BAN_GRACE') && <Field label="Ban takes effect">{user.banEffectiveAt && formatDateTime(user.banEffectiveAt)}</Field>}
              {user.banAnnouncedAt && <Field label="Ban announced">{formatDateTime(user.banAnnouncedAt)}</Field>}
              {user.role === ROLES.MERCHANT && <Field label="Application attempts">{user.applicationAttempts}</Field>}
              <Field label="Sign-in locked until">{user.lockedUntil ? formatDateTime(user.lockedUntil) : 'Not locked'}</Field>
              {user.mustChangePassword && <Field label="Password">Must change at next sign-in</Field>}
              {user.role === ROLES.ASSISTANT && (
                <>
                  <Field label="Assistant status">
                    <StatusBadge value={user.assistantStatus} type="AssistantStatus" />
                  </Field>
                  <Field label="Permissions">
                    <span className="flex flex-wrap gap-1">
                      {(user.permissions ?? []).map((p) => (
                        <Badge key={p} tone="primary">
                          {PERM_LABELS[p] ?? p}
                        </Badge>
                      ))}
                    </span>
                  </Field>
                </>
              )}
            </dl>
          </Card.Body>
        </Card>
        <div className="space-y-6">
          {user.role === ROLES.CUSTOMER && <CustomerScoreCard customerPublicId={user.publicId} />}
          {user.role === ROLES.MERCHANT && (
            <Card className="p-5 text-sm text-slate-600 dark:text-slate-300">
              Store records use a store id (STR-…), not this account id. Find the store on the{' '}
              <Link to="/admin/stores" className="font-semibold text-primary-700 hover:underline dark:text-primary-300">
                Stores
              </Link>{' '}
              page.
            </Card>
          )}
          {(user.role === ROLES.ADMIN || user.role === ROLES.SUPER_ADMIN) && (
            <Card className="p-5 text-sm text-slate-600 dark:text-slate-300">Admin accounts are managed by the super admin on the Admins page.</Card>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(action)}
        title={action?.title}
        message={action?.message}
        confirmLabel={action?.label}
        tone={action?.tone ?? 'primary'}
        requireReason={!action?.optional}
        reasonOptional={action?.optional}
        reasonLabel={action?.reasonLabel ?? 'Reason'}
        error={dialog.error}
        onConfirm={dialog.run((reason) => action.call(publicId, reason), action?.done, applied, onError)}
        onCancel={dialog.close}
      />
    </>
  )
}
