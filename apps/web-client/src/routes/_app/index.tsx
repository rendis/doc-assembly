import { authApi } from '@/features/auth/api/auth-api';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { workspaceApi } from '@/features/workspaces/api/workspace-api';
import type { Workspace } from '@/features/workspaces/types';
import { useAppContextStore } from '@/stores/app-context-store';
import {
  Folder,
  FileText,
  Settings,
  Search,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { CreateWorkspaceDialog } from '@/features/workspaces/components/CreateWorkspaceDialog';
import { useDebounce } from '@/hooks/use-debounce';
import { cn } from '@/lib/utils';

export const Route = createFileRoute('/_app/')({
  component: DashboardIndex,
});

function DashboardIndex() {
  const { t } = useTranslation();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 500);

  const { currentTenant, setWorkspace } = useAppContextStore();
  const navigate = useNavigate();

  const isSystemTenant = currentTenant?.code === 'SYS';
  const LIMIT = 12;

  useEffect(() => {
    if (!currentTenant) return;

    const fetchWorkspaces = async () => {
      setLoading(true);
      try {
        if (debouncedSearch) {
          const results = await workspaceApi.searchWorkspaces(debouncedSearch);
          setWorkspaces(results);
          setTotal(results.length);
        } else {
          const offset = (page - 1) * LIMIT;
          const { items, total } = await workspaceApi.listWorkspaces(LIMIT, offset);
          setWorkspaces(items);
          setTotal(total);
        }
      } catch (error) {
        console.error('Failed to load workspaces', error);
        setWorkspaces([]);
      } finally {
        setLoading(false);
      }
    };

    fetchWorkspaces();
  }, [currentTenant, page, debouncedSearch]);

  const handleSelectWorkspace = (ws: Workspace) => {
    setWorkspace(ws);
    authApi.recordAccess(ws.id, 'WORKSPACE').catch(console.error);
    navigate({ to: '/workspace/$workspaceId', params: { workspaceId: ws.id } });
  };

  const handleWorkspaceCreated = (newWs: Workspace) => {
    setWorkspaces([newWs, ...workspaces]);
    setTotal(total + 1);
  };

  const isInitialLoading = loading && workspaces.length === 0;
  const isRefreshing = loading && workspaces.length > 0;

  return (
    <div className="container mx-auto max-w-6xl py-8 text-foreground transition-colors min-h-screen">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('workspace.title')}</h1>
          <p className="text-muted-foreground">
            {t('workspace.subtitle', { tenantName: currentTenant?.name })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              placeholder={t('workspace.searchPlaceholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 w-full rounded-lg border border-input bg-card pl-10 pr-4 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
            {isRefreshing && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <Loader2 className="h-3 w-3 animate-spin text-primary" />
              </div>
            )}
          </div>
          {!isSystemTenant && (
            <CreateWorkspaceDialog onWorkspaceCreated={handleWorkspaceCreated} />
          )}
        </div>
      </div>

      <div
        className={cn(
          'relative transition-opacity duration-300',
          isRefreshing ? 'opacity-50 pointer-events-none' : 'opacity-100'
        )}
      >
        {isInitialLoading ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="h-48 animate-pulse rounded-xl bg-card border border-muted/50"
              />
            ))}
          </div>
        ) : workspaces.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center rounded-xl border border-dashed border-muted-foreground/25 bg-muted/5">
            <p className="text-muted-foreground">
              {search ? t('common.noResults') : t('workspace.no_workspaces')}
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mb-8">
              {workspaces.map((ws) => (
                <div
                  key={ws.id}
                  onClick={() => handleSelectWorkspace(ws)}
                  className="group relative cursor-pointer overflow-hidden rounded-xl border bg-card p-5 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md hover:border-primary/50"
                >
                  <div className="mb-4 flex items-start justify-between">
                    <div
                      className={cn(
                        'rounded-lg p-2.5 transition-colors',
                        ws.type === 'SYSTEM'
                          ? 'bg-admin-muted text-admin'
                          : 'bg-accent-blue-muted text-accent-blue'
                      )}
                    >
                      {ws.type === 'SYSTEM' ? (
                        <Settings className="h-5 w-5" />
                      ) : (
                        <Folder className="h-5 w-5" />
                      )}
                    </div>
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-secondary-foreground">
                      {ws.role}
                    </span>
                  </div>

                  <h3 className="mb-1 text-base font-bold text-card-foreground group-hover:text-primary transition-colors">
                    {ws.name}
                  </h3>
                  <p className="text-xs text-muted-foreground line-clamp-2 min-h-[2rem]">
                    {ws.type === 'SYSTEM'
                      ? t('workspace.type_system')
                      : t('workspace.type_client')}
                  </p>

                  <div className="mt-4 flex items-center justify-between text-[10px] text-muted-foreground border-t pt-3 border-muted/50">
                    <div className="flex items-center gap-1">
                      <FileText className="h-3 w-3" />
                      <span>0 {t('workspace.documents')}</span>
                    </div>
                    <span>{ws.status}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {!debouncedSearch && total > LIMIT && (
              <div className="flex items-center justify-between border-t border-muted/50 py-4">
                <p className="text-sm text-muted-foreground">
                  {t('pagination.showing', { from: (page - 1) * LIMIT + 1, to: Math.min(page * LIMIT, total), total })}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-card px-3 text-sm font-medium hover:bg-accent disabled:opacity-50 transition-colors"
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" /> {t('common.previous')}
                  </button>
                  <button
                    onClick={() => setPage((p) => p + 1)}
                    disabled={page * LIMIT >= total}
                    className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-card px-3 text-sm font-medium hover:bg-accent disabled:opacity-50 transition-colors"
                  >
                    {t('common.next')} <ChevronRight className="h-4 w-4 ml-1" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
