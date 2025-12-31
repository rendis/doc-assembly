import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { useAuthStore } from '@/stores/auth-store'
import { SystemRole } from '@/features/auth/rbac/rules'

export const Route = createFileRoute('/admin')({
  beforeLoad: () => {
    const { systemRoles } = useAuthStore.getState()
    // Only SUPERADMIN can access admin panel
    if (!systemRoles.includes(SystemRole.SUPERADMIN)) {
      throw redirect({ to: '/select-tenant' })
    }
  },
  component: AdminLayout,
})

function AdminLayout() {
  return (
    <div className="flex min-h-screen bg-background">
      {/* Admin sidebar */}
      <aside className="hidden w-64 border-r bg-muted/30 lg:block">
        <div className="flex h-16 items-center border-b px-6">
          <h2 className="font-display text-lg font-semibold">Admin Panel</h2>
        </div>
        <nav className="space-y-1 p-4">
          <a
            href="/admin"
            className="block rounded-sm px-3 py-2 text-sm font-medium hover:bg-accent"
          >
            Overview
          </a>
          <a
            href="/admin/tenants"
            className="block rounded-sm px-3 py-2 text-sm font-medium hover:bg-accent"
          >
            Tenants
          </a>
          <a
            href="/admin/users"
            className="block rounded-sm px-3 py-2 text-sm font-medium hover:bg-accent"
          >
            Users
          </a>
          <a
            href="/admin/settings"
            className="block rounded-sm px-3 py-2 text-sm font-medium hover:bg-accent"
          >
            Settings
          </a>
          <a
            href="/admin/audit"
            className="block rounded-sm px-3 py-2 text-sm font-medium hover:bg-accent"
          >
            Audit Log
          </a>
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  )
}
