import { createRootRoute, Outlet, redirect } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/router-devtools'
import { useAppContextStore } from '@/stores/app-context-store'
import { UserMenu } from '@/components/common/UserMenu'
import { AppSidebar } from '@/components/layout/AppSidebar'
import { TenantSelector } from '@/features/tenants/components/TenantSelector'
import { Suspense } from 'react'

export const Route = createRootRoute({
  beforeLoad: ({ location }) => {
    const { currentTenant } = useAppContextStore.getState()
    
    // Si no hay tenant y no estamos ya en la página de selección, redirigir
    // (A menos que queramos forzar selección automática en App)
    if (!currentTenant && location.pathname !== '/select-tenant') {
      throw redirect({
        to: '/select-tenant',
      })
    }
  },
  component: RootComponent,
})

function RootComponent() {
    const { currentWorkspace } = useAppContextStore()

    return (
      <Suspense fallback="Loading...">
        <div className="flex h-screen bg-background text-foreground transition-colors">
          {/* Sidebar Global */}
          <AppSidebar />

          <div className="flex flex-1 flex-col overflow-hidden">
            {/* Top Header */}
            <header className="flex h-14 items-center justify-between border-b bg-card px-6 py-2 shadow-sm transition-colors">
              <div className="flex items-center gap-2">
                 <TenantSelector />
                 
                 {currentWorkspace && (
                    <>
                        <span className="text-slate-300 dark:text-slate-700 text-lg font-light">/</span>
                        <div className="flex items-center gap-2 px-2 py-1 rounded-md bg-muted/50 border border-transparent">
                            <span className="text-sm font-bold tracking-tight text-foreground truncate max-w-[200px]">
                                {currentWorkspace.name}
                            </span>
                            {currentWorkspace.type === 'SYSTEM' && (
                                <span className="text-[10px] bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-300 px-1 rounded font-bold uppercase">SYS</span>
                            )}
                        </div>
                    </>
                 )}
              </div>
              
              <div className="flex items-center gap-4">
                <UserMenu />
              </div>
            </header>

            {/* Main Content Area */}
            <main className="flex-1 overflow-auto p-6">
              <Outlet />
            </main>
          </div>
        </div>
        <TanStackRouterDevtools />
      </Suspense>
    )
}