import { useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import { Ban, Hourglass, TriangleAlert } from 'lucide-react'
import { selectRole, selectStatusReason, selectUserStatus } from '@/store/slices/authSlice'
import { ROLES, USER_STATUS } from '@/config/permissions'
import { cn } from '@/utils/cn'

// What each (role, status) pair shows. Only statuses the user can see are listed.
// A merchant in the silent ban grace period is reported as ACTIVE, so no banner appears: never guess it.
const BANNERS = {
  [ROLES.CUSTOMER]: {
    [USER_STATUS.BANNED]: {
      tone: 'danger',
      icon: Ban,
      title: 'Your account is banned',
      text: 'You can still browse and see your order history, but you cannot place orders, confirm quotes or send payments.',
    },
  },
  [ROLES.MERCHANT]: {
    [USER_STATUS.PENDING_APPROVAL]: {
      tone: 'warning',
      icon: Hourglass,
      title: 'Awaiting approval',
      text: 'You can set up your store, bank accounts, couriers, shipping and draft products. Products go live and assistants can be added after approval.',
    },
    [USER_STATUS.REJECTED]: {
      tone: 'danger',
      icon: TriangleAlert,
      title: 'Your application was not approved',
      text: 'Check the reason and resubmit if you still have attempts left.',
      link: { to: '/merchant/application', label: 'View application' },
    },
    [USER_STATUS.BANNED]: {
      tone: 'danger',
      icon: Ban,
      title: 'Your store is banned',
      text: 'You can view your history, but you cannot make changes.',
    },
  },
}

const toneStyles = {
  warning: 'border-warning-200 bg-warning-50 text-warning-900 dark:border-warning-500/30 dark:bg-warning-500/10 dark:text-warning-200',
  danger: 'border-danger-200 bg-danger-50 text-danger-900 dark:border-danger-500/30 dark:bg-danger-500/10 dark:text-danger-200',
}

// Account status banner used by every layout. Renders nothing for normal accounts.
export default function StatusBanner({ className }) {
  const role = useSelector(selectRole)
  const status = useSelector(selectUserStatus)
  const reason = useSelector(selectStatusReason)
  const banner = BANNERS[role]?.[status]
  if (!banner) return null
  const Icon = banner.icon

  return (
    <div role="status" className={cn('border-b', toneStyles[banner.tone], className)}>
      <div className="mx-auto flex max-w-7xl items-start gap-3 px-4 py-3 text-sm sm:px-6 lg:px-8">
        <Icon aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{banner.title}</p>
          <p className="opacity-90">{banner.text}</p>
          {reason && (
            <p className="mt-1">
              <span className="font-medium">Reason: </span>
              {reason}
            </p>
          )}
        </div>
        {banner.link && (
          <Link to={banner.link.to} className="shrink-0 font-semibold underline underline-offset-2">
            {banner.link.label}
          </Link>
        )}
      </div>
    </div>
  )
}
