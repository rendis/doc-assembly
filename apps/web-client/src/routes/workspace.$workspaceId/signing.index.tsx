import { createFileRoute } from '@tanstack/react-router'
import { SigningListPage } from '@/features/signing/components/SigningListPage'

export const Route = createFileRoute('/workspace/$workspaceId/signing/')({
  component: SigningListPage,
})
