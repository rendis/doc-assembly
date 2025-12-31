import { createFileRoute } from '@tanstack/react-router'
import { DocumentsPage } from '@/features/documents'

export const Route = createFileRoute('/workspace/$workspaceId/documents')({
  component: DocumentsPage,
})
