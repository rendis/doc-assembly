import { createRootRoute, Outlet, useNavigate, useLocation } from '@tanstack/react-router'
import { LayoutGroup } from 'framer-motion'
import { useEffect } from 'react'
import { useAuthStore } from '@/stores/auth-store'

export const Route = createRootRoute({
  component: RootLayout,
})

const PUBLIC_ROUTES = ['/login']

function RootLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated())
  const isAuthLoading = useAuthStore((state) => state.isAuthLoading)

  useEffect(() => {
    // Skip check while auth is loading
    if (isAuthLoading) return

    // Check if current route is public
    const isPublicRoute = PUBLIC_ROUTES.some(route =>
      location.pathname.startsWith(route)
    )

    // If not authenticated and not on public route, redirect to login
    if (!isAuthenticated && !isPublicRoute) {
      console.log('[Auth Guard] Not authenticated, redirecting to login')
      navigate({ to: '/login', replace: true })
    }
  }, [isAuthenticated, isAuthLoading, location.pathname, navigate])

  return (
    <LayoutGroup>
      <div className="min-h-screen bg-background text-foreground">
        <Outlet />
      </div>
    </LayoutGroup>
  )
}
