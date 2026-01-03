import { createFileRoute } from '@tanstack/react-router'
import { TemplateDetailPage } from '@/features/templates/components/TemplateDetailPage'

export const Route = createFileRoute('/workspace/$workspaceId/templates/$templateId')({
  component: TemplateDetailPage,
})
