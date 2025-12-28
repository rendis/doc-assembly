import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { tenantApi } from '@/features/tenants/api/tenant-api';
import type { Tenant } from '@/features/tenants/types';
import { useDebounce } from '@/hooks/use-debounce';
import { usePermission } from '@/features/auth/hooks/usePermission';
import { Permission } from '@/features/auth/rbac/rules';
import { Search, MoreHorizontal, Loader2, Pencil, Trash2 } from 'lucide-react';
import { CreateTenantDialog } from '@/features/tenants/components/CreateTenantDialog';

export const Route = createFileRoute('/admin/tenants')({
  component: AdminTenantsPage,
});

function AdminTenantsPage() {
  const { t } = useTranslation();
  const { can } = usePermission();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const debouncedSearch = useDebounce(search, 500);
  const LIMIT = 20;

  const canManageTenants = can(Permission.SYSTEM_TENANTS_MANAGE);

  useEffect(() => {
    const fetchTenants = async () => {
      setLoading(true);
      try {
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
      } catch (error) {
        console.error('Failed to fetch tenants', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTenants();
  }, [page, debouncedSearch]);

  const handleTenantCreated = (newTenant: Tenant) => {
    setTenants([newTenant, ...tenants]);
    setTotal(total + 1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {t('admin.tenants.title', { defaultValue: 'Tenant Management' })}
          </h1>
          <p className="text-muted-foreground">
            {t('admin.tenants.description', {
              defaultValue: 'Manage all organizations in the platform',
            })}
          </p>
        </div>
        {canManageTenants && (
          <CreateTenantDialog onTenantCreated={handleTenantCreated} />
        )}
      </div>

      {/* Search */}
      <div className="flex items-center justify-between">
        <div className="relative w-72">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            placeholder={t('admin.tenants.searchPlaceholder', {
              defaultValue: 'Search tenants...',
            })}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring text-foreground"
          />
        </div>
        <div className="text-sm text-muted-foreground">
          {t('admin.tenants.totalCount', {
            defaultValue: '{{count}} tenants',
            count: total,
          })}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card overflow-hidden">
        <table className="w-full caption-bottom text-sm text-left">
          <thead>
            <tr className="border-b bg-muted/50 transition-colors">
              <th className="h-12 px-4 align-middle font-medium text-muted-foreground">
                {t('admin.tenants.name', { defaultValue: 'Name' })}
              </th>
              <th className="h-12 px-4 align-middle font-medium text-muted-foreground">
                {t('admin.tenants.code', { defaultValue: 'Code' })}
              </th>
              <th className="h-12 px-4 align-middle font-medium text-muted-foreground">
                {t('admin.tenants.createdAt', { defaultValue: 'Created' })}
              </th>
              <th className="h-12 px-4 align-middle font-medium text-muted-foreground text-right">
                {t('admin.tenants.actions', { defaultValue: 'Actions' })}
              </th>
            </tr>
          </thead>
          <tbody className="[&_tr:last-child]:border-0">
            {loading ? (
              <tr>
                <td colSpan={4} className="h-24 text-center">
                  <div className="flex justify-center items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t('common.loading', { defaultValue: 'Loading...' })}
                  </div>
                </td>
              </tr>
            ) : tenants.length === 0 ? (
              <tr>
                <td colSpan={4} className="h-24 text-center text-muted-foreground">
                  {t('admin.tenants.noResults', { defaultValue: 'No tenants found.' })}
                </td>
              </tr>
            ) : (
              tenants.map((tenant) => (
                <tr
                  key={tenant.id}
                  className="border-b transition-colors hover:bg-muted/50"
                >
                  <td className="p-4 align-middle font-medium">{tenant.name}</td>
                  <td className="p-4 align-middle">
                    <span className="inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold bg-secondary text-secondary-foreground">
                      {tenant.code}
                    </span>
                  </td>
                  <td className="p-4 align-middle text-muted-foreground">
                    {new Date(tenant.createdAt).toLocaleDateString()}
                  </td>
                  <td className="p-4 align-middle text-right">
                    <div className="flex items-center justify-end gap-1">
                      {canManageTenants && (
                        <>
                          <button
                            className="inline-flex items-center justify-center rounded-md text-sm font-medium hover:bg-accent hover:text-accent-foreground h-8 w-8 p-0"
                            title={t('common.edit', { defaultValue: 'Edit' })}
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            className="inline-flex items-center justify-center rounded-md text-sm font-medium hover:bg-destructive/10 hover:text-destructive h-8 w-8 p-0"
                            title={t('common.delete', { defaultValue: 'Delete' })}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </>
                      )}
                      <button className="inline-flex items-center justify-center rounded-md text-sm font-medium hover:bg-accent hover:text-accent-foreground h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {total > 0
            ? t('admin.tenants.pagination', {
                defaultValue: 'Page {{page}} of {{totalPages}}',
                page,
                totalPages: Math.ceil(total / LIMIT),
              })
            : t('admin.tenants.noResults', { defaultValue: 'No results' })}
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1 || loading}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-8 px-4 disabled:opacity-50 disabled:pointer-events-none"
          >
            {t('common.previous', { defaultValue: 'Previous' })}
          </button>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={page * LIMIT >= total || loading || total === 0}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-8 px-4 disabled:opacity-50 disabled:pointer-events-none"
          >
            {t('common.next', { defaultValue: 'Next' })}
          </button>
        </div>
      </div>
    </div>
  );
}
