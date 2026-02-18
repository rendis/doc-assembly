import { createFileRoute, redirect } from '@tanstack/react-router'
import { useAppContextStore } from '@/stores/app-context-store'
import { SettingsPage } from '@/features/settings'

export const Route = createFileRoute('/workspace/$workspaceId/settings')({
  beforeLoad: ({ params }) => {
    const { currentWorkspace } = useAppContextStore.getState()
    if (currentWorkspace?.type === 'SYSTEM') {
      throw redirect({ to: '/workspace/$workspaceId', params })
    }
  },
  component: SettingsPage,
})
