import { createFileRoute } from '@tanstack/react-router'
import { PublicDocumentAccessPage } from '@/features/public-signing/components/PublicDocumentAccessPage'

export const Route = createFileRoute('/public/doc/$documentId')({
  component: PublicDocAccessRoute,
})

function PublicDocAccessRoute() {
  const { documentId } = Route.useParams()
  return <PublicDocumentAccessPage documentId={documentId} />
}
