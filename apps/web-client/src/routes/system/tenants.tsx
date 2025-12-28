import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { tenantApi } from '@/features/tenants/api/tenant-api'
import type { Tenant } from '@/features/tenants/types'
import { useDebounce } from '@/hooks/use-debounce'
import { Search, MoreHorizontal, Loader2 } from 'lucide-react'
import { CreateTenantDialog } from '@/features/tenants/components/CreateTenantDialog'

export const Route = createFileRoute('/system/tenants')({
  component: SystemTenantsPage,
})

function SystemTenantsPage() {
  const { t } = useTranslation()
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  
  const debouncedSearch = useDebounce(search, 500)
  const LIMIT = 20

  useEffect(() => {
    const fetchTenants = async () => {
      setLoading(true)
      try {
        if (debouncedSearch) {
            const results = await tenantApi.searchSystemTenants(debouncedSearch)
            setTenants(results)
            setTotal(results.length)
        } else {
            const offset = (page - 1) * LIMIT
            const { items, total } = await tenantApi.listSystemTenants(LIMIT, offset)
            setTenants(items)
            setTotal(total)
        }
      } catch (error) {
        console.error("Failed to fetch tenants", error)
      } finally {
        setLoading(false)
      }
    }

    fetchTenants()
  }, [page, debouncedSearch])

  const handleTenantCreated = (newTenant: Tenant) => {
    setTenants([newTenant, ...tenants])
    setTotal(total + 1)
  }

  return (
    <div className="container mx-auto py-8 text-foreground">
      <div className="flex items-center justify-between mb-6">
        <div>
            <h1 className="text-2xl font-bold tracking-tight">Organization Management</h1>
            <p className="text-muted-foreground">Manage all system tenants.</p>
        </div>
        <CreateTenantDialog onTenantCreated={handleTenantCreated} />
      </div>

      <div className="flex items-center justify-between mb-4">
        <div className="relative w-72">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
                placeholder="Search organizations..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring text-foreground"
            />
        </div>
      </div>

      <div className="rounded-md border bg-card overflow-hidden">
        <table className="w-full caption-bottom text-sm text-left">
            <thead>
                <tr className="border-b bg-muted/50 transition-colors">
                    <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Name</th>
                    <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Code</th>
                    <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Created At</th>
                    <th className="h-12 px-4 align-middle font-medium text-muted-foreground text-right">Actions</th>
                </tr>
            </thead>
            <tbody className="[&_tr:last-child]:border-0">
                {loading ? (
                    <tr>
                        <td colSpan={4} className="h-24 text-center">
                            <div className="flex justify-center items-center gap-2">
                                <Loader2 className="h-4 w-4 animate-spin" /> {t('common.loading')}
                            </div>
                        </td>
                    </tr>
                ) : tenants.length === 0 ? (
                    <tr>
                        <td colSpan={4} className="h-24 text-center text-muted-foreground">No tenants found.</td>
                    </tr>
                ) : (
                    tenants.map((tenant) => (
                        <tr key={tenant.id} className="border-b transition-colors hover:bg-muted/50">
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
                                <button className="inline-flex items-center justify-center rounded-md text-sm font-medium hover:bg-accent hover:text-accent-foreground h-8 w-8 p-0">
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
            {total > 0 ? `Page ${page} of ${Math.ceil(total / LIMIT)}` : 'No results'}
        </div>
        <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1 || loading}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-8 px-4 disabled:opacity-50"
        >
            Previous
        </button>
        <button
            onClick={() => setPage(p => p + 1)}
            disabled={page * LIMIT >= total || loading || total === 0}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-8 px-4 disabled:opacity-50"
        >
            Next
        </button>
      </div>
    </div>
  )
}