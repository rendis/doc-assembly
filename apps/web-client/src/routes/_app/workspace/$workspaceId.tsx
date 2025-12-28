import { createFileRoute, Outlet } from '@tanstack/react-router';
import { useEffect } from 'react';
import { useAppContextStore } from '@/stores/app-context-store';
import { workspaceApi } from '@/features/workspaces/api/workspace-api';
import { PermissionGuard } from '@/components/common/PermissionGuard';
import { Permission } from '@/features/auth/rbac/rules';

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

  useEffect(() => {
    if (workspace) {
      setWorkspace(workspace);
    }
  }, [workspace, setWorkspace]);

  return (
    <div className="flex h-[calc(100vh-57px)]">
      <aside className="w-64 border-r bg-slate-50 p-4 dark:bg-slate-900 dark:border-slate-800">
        <div className="mb-6">
          <h2 className="font-bold text-slate-800 px-2 dark:text-slate-100">
            {workspace.name}
          </h2>
          <p className="text-xs text-slate-500 px-2 uppercase tracking-wider mt-1">
            {workspace.type}
          </p>
        </div>

        <nav className="space-y-1">
          <a
            href="#"
            className="block rounded-md bg-white px-3 py-2 text-sm font-medium text-primary shadow-sm ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700 dark:text-primary"
          >
            Documentos
          </a>
          <a
            href="#"
            className="block rounded-md px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            Plantillas
          </a>

          <PermissionGuard permission={Permission.WORKSPACE_UPDATE}>
            <a
              href="#"
              className="block rounded-md px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            >
              Configuración
            </a>
          </PermissionGuard>
        </nav>
      </aside>

      <main className="flex-1 overflow-auto bg-background p-6">
        <Outlet />
      </main>
    </div>
  );
}
