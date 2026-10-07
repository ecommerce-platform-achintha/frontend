import { useRouteError } from 'react-router-dom'
import { TriangleAlert } from 'lucide-react'
import Button from '@/components/ui/Button'
import EmptyState from '@/components/ui/EmptyState'

// Shown when a page crashes while rendering, instead of a blank screen.
export default function RouteErrorPage() {
  const error = useRouteError()
  console.error(error)
  return (
    <div className="flex min-h-dvh items-center justify-center px-4">
      <EmptyState
        icon={TriangleAlert}
        title="Something went wrong"
        description="This page hit an unexpected problem. Reload to try again."
        action={<Button onClick={() => window.location.reload()}>Reload page</Button>}
      />
    </div>
  )
}
