import { createFileRoute, Outlet, useLocation, useMatches } from '@tanstack/react-router';
import { useEffect } from 'react';
import { useAppContextStore } from '@/stores/app-context-store';
import { workspaceApi } from '@/features/workspaces/api/workspace-api';
import { WorkspaceTabs } from '@/components/common/WorkspaceTabs';
import { cn } from '@/lib/utils';

export const Route = createFileRoute('/_app/workspace/$workspaceId')({
  loader: async ({ params }) => {
    const workspace = await workspaceApi.getWorkspace(params.workspaceId);
    return workspace;
  },
  component: WorkspaceLayout,
});

function WorkspaceLayout() {
  const { setWorkspace } = useAppContextStore();
  const workspace = Route.useLoaderData();
  const { workspaceId } = Route.useParams();
  const location = useLocation();
  const matches = useMatches();

  // Detectar si estamos en modo diseño para ocultar el header y tabs
  // Verificamos de forma muy permisiva tanto la ruta como los IDs de las rutas activas
  const isDesignMode = 
    location.pathname.includes('/design') || 
    matches.some(m => m.routeId.toLowerCase().includes('design'));

  useEffect(() => {
    if (workspace) {
      setWorkspace(workspace);
    }
  }, [workspace, setWorkspace]);

  return (
    <div className="flex flex-col h-full">
      {!isDesignMode && (
        <>
          {/* Workspace Header */}
          <div className="flex-shrink-0 bg-card border-b border-border px-6 py-4">
            <h1 className="text-xl font-bold text-foreground">{workspace.name}</h1>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1">
              {workspace.type}
            </p>
          </div>

          {/* Horizontal Tabs */}
          <div className="flex-shrink-0">
            <WorkspaceTabs workspaceId={workspaceId} />
          </div>
        </>
      )}

      {/* Content Area */}
      <main className={cn("flex-1 overflow-hidden bg-background", isDesignMode && "p-0")}>
        <Outlet />
      </main>
    </div>
  );
}
