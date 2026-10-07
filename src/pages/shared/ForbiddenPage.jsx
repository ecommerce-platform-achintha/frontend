import { useSelector } from 'react-redux'
import { Lock } from 'lucide-react'
import { selectAccessUser, selectIsAuthenticated } from '@/store/slices/authSlice'
import { landingPathFor } from '@/config/permissions'
import Button from '@/components/ui/Button'
import EmptyState from '@/components/ui/EmptyState'

// Friendly 403. ProtectedRoute sends users here when their role or permissions do not fit.
export default function ForbiddenPage() {
  const isAuthenticated = useSelector(selectIsAuthenticated)
  const user = useSelector(selectAccessUser)
  const home = isAuthenticated ? landingPathFor(user) : '/'
  return (
    <div className="flex min-h-[60dvh] items-center justify-center">
      <EmptyState
        icon={Lock}
        title="You do not have access to this page"
        description="Your account does not include this area. If you think this is a mistake, ask the store owner or an admin to check your permissions."
        action={
          // An assistant whose permissions open no page lands here: home would loop back, so offer the shop.
          <Button to={home === '/403' ? '/' : home}>{home === '/403' || home === '/' ? 'Go to the shop' : 'Go to my dashboard'}</Button>
        }
      />
    </div>
  )
}
