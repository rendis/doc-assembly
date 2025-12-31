import { createFileRoute } from '@tanstack/react-router'
import { SettingsPage } from '@/features/settings'

export const Route = createFileRoute('/workspace/$workspaceId/settings')({
  component: SettingsPage,
})
