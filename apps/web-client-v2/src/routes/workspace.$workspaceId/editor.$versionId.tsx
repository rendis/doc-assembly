import { createFileRoute } from '@tanstack/react-router'
import { EditorPage } from '@/features/editor'

export const Route = createFileRoute('/workspace/$workspaceId/editor/$versionId')({
  component: EditorPage,
})
