import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  fetchTemplateWithVersions,
  createVersion,
} from '../api/templates-api'
import type { CreateVersionRequest } from '@/types/api'
import { templateKeys } from './useTemplates'

export const templateDetailKeys = {
  all: ['template-detail'] as const,
  detail: (templateId: string) =>
    [...templateDetailKeys.all, templateId] as const,
}

export function useTemplateWithVersions(templateId: string) {
  return useQuery({
    queryKey: templateDetailKeys.detail(templateId),
    queryFn: () => fetchTemplateWithVersions(templateId),
    enabled: !!templateId,
  })
}

export function useCreateVersion(templateId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateVersionRequest) => createVersion(templateId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: templateDetailKeys.detail(templateId),
      })
      // Also invalidate the templates list to update version count
      queryClient.invalidateQueries({ queryKey: templateKeys.all })
    },
  })
}
