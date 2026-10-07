import { SearchX } from 'lucide-react'
import Button from '@/components/ui/Button'
import EmptyState from '@/components/ui/EmptyState'

export default function NotFoundPage() {
  return (
    <div className="flex min-h-[60dvh] items-center justify-center">
      <EmptyState
        icon={SearchX}
        title="Page not found"
        description="The link may be broken, or the page may have been removed."
        action={<Button to="/">Back to the shop</Button>}
      />
    </div>
  )
}
