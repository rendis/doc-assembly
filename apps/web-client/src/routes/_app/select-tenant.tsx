import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { tenantApi } from '@/features/tenants/api/tenant-api';
import { authApi } from '@/features/auth/api/auth-api';
import type { Tenant } from '@/features/tenants/types';
import { useAuthStore } from '@/stores/auth-store';
import { useAppContextStore } from '@/stores/app-context-store';
import { useDebounce } from '@/hooks/use-debounce';
import { CreateTenantDialog } from '@/features/tenants/components/CreateTenantDialog';
import { Search, Loader2, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';

export const Route = createFileRoute('/_app/select-tenant')({
  component: SelectTenantPage,
});

function SelectTenantPage() {
  const { t } = useTranslation();
  const { isSuperAdmin } = useAuthStore();
  const { setTenant } = useAppContextStore();
  const navigate = useNavigate();

  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 500);

  const isSystemAdmin = isSuperAdmin();
  const LIMIT = 10;

  const handleSelect = useCallback(
    (tenant: Tenant) => {
      setTenant(tenant);
      authApi.recordAccess(tenant.id, 'TENANT').catch(console.error);
      navigate({ to: '/' });
    },
    [setTenant, navigate]
  );

  useEffect(() => {
    const fetchTenants = async () => {
      setLoading(true);
      try {
        if (isSystemAdmin) {
          if (debouncedSearch) {
            const results = await tenantApi.searchSystemTenants(debouncedSearch);
            setTenants(results);
            setTotal(results.length);
          } else {
            const offset = (page - 1) * LIMIT;
            const { items, total } = await tenantApi.listSystemTenants(LIMIT, offset);
            setTenants(items);
            setTotal(total);
          }
        } else {
          const data = await tenantApi.getMyTenants();
          const list = Array.isArray(data) ? data : [];
          setTenants(list);
          if (list.length === 1) {
            handleSelect(list[0]);
          }
        }
      } catch (error) {
        console.error('Failed to load tenants', error);
        setTenants([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTenants();
  }, [isSystemAdmin, page, debouncedSearch, handleSelect]);

  const handleTenantCreated = (newTenant: Tenant) => {
    setTenants([newTenant, ...tenants]);
    setTotal(total + 1);
  };

  const isInitialLoading = loading && tenants.length === 0;
  const isRefreshing = loading && tenants.length > 0;

  // --- Render para Usuario Normal (Cards) ---
  if (!isSystemAdmin) {
    if (isInitialLoading)
      return (
        <div className="flex h-screen items-center justify-center">
          {t('auth.loading_tenants')}
        </div>
      );

    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 text-foreground transition-colors relative">
        <div
          className={cn(
            'w-full max-w-md rounded-lg border bg-card p-6 shadow-sm text-card-foreground transition-opacity duration-300',
            isRefreshing && 'opacity-50 pointer-events-none'
          )}
        >
          <h1 className="mb-6 text-center text-2xl font-bold">
            {t('auth.select_tenant')}
          </h1>

          {tenants.length === 0 ? (
            <p className="text-center text-muted-foreground">{t('auth.no_tenants')}</p>
          ) : (
            <div className="space-y-3">
              {tenants.map((tenant) => (
                <button
                  key={tenant.id}
                  onClick={() => handleSelect(tenant)}
                  className="flex w-full items-center justify-between rounded-md border p-4 text-left transition-colors hover:bg-accent hover:text-accent-foreground active:scale-[0.98]"
                >
                  <div>
                    <div className="font-semibold">{tenant.name}</div>
                    <div className="text-sm text-muted-foreground">{tenant.code}</div>
                  </div>
                  <div className="rounded-full bg-secondary px-2 py-1 text-xs font-medium text-secondary-foreground">
                    {tenant.role}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // --- Render para SuperAdmin (Tabla de Gestión) ---
  return (
    <div className="container mx-auto py-8 text-foreground min-h-screen pt-20">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {t('auth.select_tenant')}
          </h1>
          <p className="text-muted-foreground">{t('auth.selectOrManage')}</p>
        </div>
        <CreateTenantDialog onTenantCreated={handleTenantCreated} />
      </div>

      <div className="flex items-center justify-between mb-4">
        <div className="relative w-72">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            placeholder={t('tenant.searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
          {isRefreshing && (
            <div className="absolute right-3 top-2.5">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
            </div>
          )}
        </div>
      </div>

      <div
        className={cn(
          'rounded-md border bg-card overflow-hidden shadow-sm transition-opacity duration-300',
          isRefreshing ? 'opacity-50 pointer-events-none' : 'opacity-100'
        )}
      >
        <table className="w-full caption-bottom text-sm text-left">
          <thead>
            <tr className="border-b bg-muted/50 transition-colors">
              <th className="h-12 px-4 align-middle font-medium text-muted-foreground">
                {t('common.name')}
              </th>
              <th className="h-12 px-4 align-middle font-medium text-muted-foreground">
                {t('common.code')}
              </th>
              <th className="h-12 px-4 align-middle font-medium text-muted-foreground">
                {t('common.createdAt')}
              </th>
              <th className="h-12 px-4 align-middle font-medium text-muted-foreground text-right">
                {t('common.actions')}
              </th>
            </tr>
          </thead>
          <tbody className="[&_tr:last-child]:border-0">
            {isInitialLoading ? (
              <tr>
                <td colSpan={4} className="h-24 text-center">
                  <div className="flex justify-center items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> {t('common.loading')}
                  </div>
                </td>
              </tr>
            ) : tenants.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="h-24 text-center text-muted-foreground"
                >
                  {t('tenant.noTenants')}
                </td>
              </tr>
            ) : (
              tenants.map((tenant) => (
                <tr
                  key={tenant.id}
                  onClick={() => handleSelect(tenant)}
                  className="border-b transition-colors hover:bg-muted/50 cursor-pointer"
                >
                  <td className="p-4 align-middle font-medium">
                    <div className="flex items-center gap-2">
                      {tenant.name}
                      {tenant.code === 'SYS' && (
                        <span className="text-[10px] bg-primary/10 text-primary px-1 rounded">
                          {t('tenant.system')}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-4 align-middle">
                    <span className="inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold bg-secondary text-secondary-foreground">
                      {tenant.code}
                    </span>
                  </td>
                  <td className="p-4 align-middle text-muted-foreground">
                    {tenant.createdAt
                      ? new Date(tenant.createdAt).toLocaleDateString()
                      : '-'}
                  </td>
                  <td className="p-4 align-middle text-right">
                    <button
                      className="inline-flex items-center justify-center rounded-md text-sm font-medium hover:bg-accent hover:text-accent-foreground h-8 w-8 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                      }}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-end space-x-2 py-4">
        <div className="text-xs text-muted-foreground">
          {total > 0 ? t('pagination.page', { page, totalPages: Math.ceil(total / LIMIT) }) : ''}
        </div>
        <button
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page === 1 || loading}
          className="inline-flex items-center justify-center rounded-md text-sm font-medium border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-8 px-4 disabled:opacity-50"
        >
          {t('common.previous')}
        </button>
        <button
          onClick={() => setPage((p) => p + 1)}
          disabled={page * LIMIT >= total || loading || total === 0}
          className="inline-flex items-center justify-center rounded-md text-sm font-medium border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-8 px-4 disabled:opacity-50"
        >
          {t('common.next')}
        </button>
      </div>
    </div>
  );
}
