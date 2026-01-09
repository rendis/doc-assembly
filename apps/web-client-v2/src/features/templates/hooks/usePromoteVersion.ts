import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  promoteVersion,
  fetchProductionTemplates,
  type PromoteVersionRequest,
  type PromoteVersionResponse,
} from '../api/templates-api'
import { templateKeys } from './useTemplates'
import { templateDetailKeys } from './useTemplateDetail'

/**
 * Query keys for production templates (used in promote dialog)
 */
export const productionTemplateKeys = {
  all: ['production-templates'] as const,
  search: (query: string) => [...productionTemplateKeys.all, query] as const,
}

/**
 * Hook to search production templates (without sandbox header).
 * Used when promoting a version as NEW_VERSION to select target template.
 */
export function useProductionTemplates(search: string) {
  return useQuery({
    queryKey: productionTemplateKeys.search(search),
    queryFn: () => fetchProductionTemplates(search),
    enabled: search.length > 0,
    staleTime: 30 * 1000, // 30 seconds
    placeholderData: (previousData) => previousData,
  })
}

/**
 * Hook to promote a version from sandbox to production.
 * Returns mutation that handles both NEW_TEMPLATE and NEW_VERSION modes.
 */
export function usePromoteVersion(templateId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      versionId,
      request,
    }: {
      versionId: string
      request: PromoteVersionRequest
    }): Promise<PromoteVersionResponse> => promoteVersion(templateId, versionId, request),
    onSuccess: (response) => {
      // Invalidate sandbox template detail (source)
      queryClient.invalidateQueries({
        queryKey: templateDetailKeys.detail(templateId),
      })

      // Invalidate production template detail if promoting to existing template
      if (response.version.templateId !== templateId) {
        queryClient.invalidateQueries({
          queryKey: templateDetailKeys.detail(response.version.templateId),
        })
      }

      // Invalidate templates list (both sandbox and production)
      queryClient.invalidateQueries({ queryKey: templateKeys.all })

      // Invalidate production templates search
      queryClient.invalidateQueries({ queryKey: productionTemplateKeys.all })
    },
  })
}
