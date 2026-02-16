import { createFileRoute } from '@tanstack/react-router'
import { SigningDetailPage } from '@/features/signing/components/SigningDetailPage'

export const Route = createFileRoute(
  '/workspace/$workspaceId/signing/$documentId'
)({
  component: SigningDetailPage,
})
