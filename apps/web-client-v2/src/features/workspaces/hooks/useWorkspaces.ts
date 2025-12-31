import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  fetchWorkspaces,
  searchWorkspaces,
  createWorkspace,
  fetchCurrentWorkspace,
  updateCurrentWorkspace,
} from '../api/workspaces-api'
import type { CreateWorkspaceRequest, UpdateWorkspaceRequest } from '../types'

export function useWorkspaces(tenantId: string | null, page = 1, perPage = 20) {
  return useQuery({
    queryKey: ['workspaces', tenantId, page, perPage],
    queryFn: () => fetchWorkspaces(page, perPage),
    enabled: !!tenantId,
  })
}

export function useSearchWorkspaces(query: string, page = 1, perPage = 20) {
  return useQuery({
    queryKey: ['search-workspaces', query, page, perPage],
    queryFn: () => searchWorkspaces(query, page, perPage),
    enabled: query.length > 0,
  })
}

export function useCurrentWorkspace() {
  return useQuery({
    queryKey: ['current-workspace'],
    queryFn: fetchCurrentWorkspace,
  })
}

export function useCreateWorkspace() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateWorkspaceRequest) => createWorkspace(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] })
    },
  })
}

export function useUpdateWorkspace() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: UpdateWorkspaceRequest) => updateCurrentWorkspace(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['current-workspace'] })
      queryClient.invalidateQueries({ queryKey: ['workspaces'] })
    },
  })
}
