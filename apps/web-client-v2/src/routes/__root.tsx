import { createRootRoute, Outlet } from '@tanstack/react-router'
import { LayoutGroup } from 'framer-motion'

export const Route = createRootRoute({
  component: RootLayout,
})

function RootLayout() {
  return (
    <LayoutGroup>
      <div className="min-h-screen bg-background text-foreground">
        <Outlet />
      </div>
    </LayoutGroup>
  )
}
