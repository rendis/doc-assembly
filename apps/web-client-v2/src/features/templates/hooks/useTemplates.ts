import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from '@tanstack/react-query'
import {
  fetchTemplates,
  createTemplate,
  type TemplatesListParams,
} from '../api/templates-api'
import type { CreateTemplateRequest } from '@/types/api'

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

export function useCreateTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateTemplateRequest) => createTemplate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: templateKeys.all })
    },
  })
}
