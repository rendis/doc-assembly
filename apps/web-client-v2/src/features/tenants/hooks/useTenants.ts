import { useQuery } from '@tanstack/react-query'
import { fetchMyTenants, searchMyTenants } from '../api/tenants-api'

export function useMyTenants(page = 1, perPage = 20) {
  return useQuery({
    queryKey: ['my-tenants', page, perPage],
    queryFn: () => fetchMyTenants(page, perPage),
    staleTime: 0,
    gcTime: 0,
  })
}

export function useSearchTenants(query: string, page = 1, perPage = 20) {
  return useQuery({
    queryKey: ['search-tenants', query, page, perPage],
    queryFn: () => searchMyTenants(query, page, perPage),
    enabled: query.length > 0,
  })
}
