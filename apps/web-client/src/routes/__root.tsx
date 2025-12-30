import { createRootRoute, Outlet, redirect } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools';
import { useAppContextStore } from '@/stores/app-context-store';
import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';

export const Route = createRootRoute({
  beforeLoad: ({ location }) => {
    // Admin routes don't require tenant selection
    if (location.pathname.startsWith('/admin')) {
      return;
    }

    const { currentTenant } = useAppContextStore.getState();

    // For non-admin routes, require tenant selection
    if (!currentTenant && location.pathname !== '/select-tenant') {
      throw redirect({
        to: '/select-tenant',
      });
    }
  },
  component: RootComponent,
});

function RootComponent() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center bg-background">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Loading...</span>
          </div>
        </div>
      }
    >
      <Outlet />
      <TanStackRouterDevtools />
    </Suspense>
  );
}