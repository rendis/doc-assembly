import { useState, useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useAppContextStore } from '@/stores/app-context-store';
import { useAuthStore } from '@/stores/auth-store';
import { tenantApi } from '@/features/tenants/api/tenant-api';
import { authApi } from '@/features/auth/api/auth-api';
import type { Tenant } from '@/features/tenants/types';
import { Check, ChevronsUpDown, Building, Search, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDebounce } from '@/hooks/use-debounce';

export const TenantSelector = () => {
  const { currentTenant, setTenant } = useAppContextStore();
  const { isSuperAdmin } = useAuthStore();
  
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [filteredTenants, setFilteredTenants] = useState<Tenant[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  
  const navigate = useNavigate();
  const isSystemAdmin = isSuperAdmin();

  // Carga inicial
  useEffect(() => {
    tenantApi.getMyTenants()
      .then(data => {
        const list = Array.isArray(data) ? data : [];
        setTenants(list);
        setFilteredTenants(list);
      })
      .catch(console.error);
  }, []);

  // Lógica de búsqueda reactiva al valor debounced
  useEffect(() => {
    const performSearch = async () => {
        if (!debouncedSearchQuery.trim()) {
            setFilteredTenants(tenants);
            return;
        }

        setIsSearching(true);
        try {
            if (isSystemAdmin) {
                // Búsqueda global en servidor
                const results = await tenantApi.searchSystemTenants(debouncedSearchQuery);
                setFilteredTenants(results);
            } else {
                // Búsqueda local
                const lower = debouncedSearchQuery.toLowerCase();
                const results = tenants.filter(t => 
                    t.name.toLowerCase().includes(lower) || 
                    t.code.toLowerCase().includes(lower)
                );
                setFilteredTenants(results);
            }
        } catch (error) {
            console.error("Search failed", error);
        } finally {
            setIsSearching(false);
        }
    };

    performSearch();
  }, [debouncedSearchQuery, isSystemAdmin, tenants]);

  const handleSelect = (tenant: Tenant) => {
    setTenant(tenant);
    setIsOpen(false);
    setSearchQuery('');
    authApi.recordAccess(tenant.id, 'TENANT').catch(console.error);
    navigate({ to: '/' }); 
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-md border border-input bg-transparent px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground w-auto min-w-[140px] justify-between"
      >
        <div className="flex items-center gap-2 truncate">
            <Building className="h-4 w-4 shrink-0 opacity-50" />
            <span className="truncate">
                {currentTenant?.code === 'SYS' ? 'System' : (currentTenant?.code || 'Select')}
            </span>
        </div>
        <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 z-50 mt-1 w-64 rounded-md border bg-popover p-1 text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95">
          {/* Search Input */}
          <div className="flex items-center border-b px-3 pb-2 pt-1 mb-1">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <input
              className="flex h-8 w-full rounded-md bg-transparent text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 text-foreground"
              placeholder={isSystemAdmin ? "Search all tenants..." : "Filter my tenants..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
            {isSearching && <Loader2 className="h-3 w-3 animate-spin opacity-50 ml-1" />}
          </div>

          <div className="max-h-[300px] overflow-auto">
            {filteredTenants.map((tenant) => (
              <button
                key={tenant.id}
                onClick={() => handleSelect(tenant)}
                className={cn(
                  "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
                  currentTenant?.id === tenant.id && "bg-accent text-accent-foreground"
                )}
              >
                {currentTenant?.id === tenant.id && (
                  <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                    <Check className="h-4 w-4" />
                  </span>
                )}
                <div className="flex flex-col items-start text-left">
                    <span className="truncate font-medium">{tenant.name}</span>
                    <span className="text-xs text-muted-foreground">{tenant.code}</span>
                </div>
                {tenant.code === 'SYS' && (
                    <span className="ml-auto text-xs text-muted-foreground bg-secondary px-1 rounded ml-2">SYS</span>
                )}
              </button>
            ))}
            
            {filteredTenants.length === 0 && (
                <div className="py-6 text-center text-sm text-muted-foreground">
                    {isSearching ? 'Searching...' : 'No tenants found.'}
                </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
