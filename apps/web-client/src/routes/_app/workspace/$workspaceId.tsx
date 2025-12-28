import { createFileRoute, Outlet } from '@tanstack/react-router';
import { useEffect } from 'react';
import { useAppContextStore } from '@/stores/app-context-store';
import { workspaceApi } from '@/features/workspaces/api/workspace-api';
import { WorkspaceTabs } from '@/components/common/WorkspaceTabs';

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

  useEffect(() => {
    if (workspace) {
      setWorkspace(workspace);
    }
  }, [workspace, setWorkspace]);

  return (
    <div className="flex flex-col h-full">
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

      {/* Content Area */}
      <main className="flex-1 overflow-hidden bg-background">
        <Outlet />
      </main>
    </div>
  );
}
