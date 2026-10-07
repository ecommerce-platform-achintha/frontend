import { Hammer } from 'lucide-react'
import { useParams } from 'react-router-dom'
import Card from '@/components/ui/Card'
import EmptyState from '@/components/ui/EmptyState'
import PageHeader from './PageHeader'

// Temporary page body so every route works end to end. Later prompts replace these.
export default function PlaceholderPage({ title, description }) {
  const params = useParams()
  const id = params.publicId
  return (
    <>
      <PageHeader title={title} description={description} />
      <Card>
        <EmptyState
          icon={Hammer}
          title="Coming soon"
          description={id ? `This page will show ${id}.` : 'This page is part of the skeleton and will be built next.'}
        />
      </Card>
    </>
  )
}
