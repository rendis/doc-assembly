import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/workspace/$workspaceId/signing')({
  component: SigningLayout,
})

function SigningLayout() {
  return <Outlet />
}
