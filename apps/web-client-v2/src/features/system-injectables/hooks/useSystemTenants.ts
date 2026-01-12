import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { listSystemTenants } from '../api/system-tenants-api'

export const systemTenantsKeys = {
  all: ['system-tenants'] as const,
  list: (page: number, perPage: number, query?: string) =>
    [...systemTenantsKeys.all, 'list', page, perPage, query] as const,
}

export function useSystemTenants(page: number, perPage: number, query?: string) {
  return useQuery({
    queryKey: systemTenantsKeys.list(page, perPage, query),
    queryFn: () => listSystemTenants(page, perPage, query),
    placeholderData: keepPreviousData,
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}
