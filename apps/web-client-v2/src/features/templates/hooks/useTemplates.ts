import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { fetchTemplates, type TemplatesListParams } from '../api/templates-api'

export const templateKeys = {
  all: ['templates'] as const,
  list: (params: TemplatesListParams) =>
    [...templateKeys.all, 'list', params] as const,
}

export function useTemplates(params: TemplatesListParams = {}) {
  return useQuery({
    queryKey: templateKeys.list(params),
    queryFn: () => fetchTemplates(params),
    staleTime: 0,
    gcTime: 0,
    placeholderData: keepPreviousData,
  })
}
