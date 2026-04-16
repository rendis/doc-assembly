import apiClient, { type PaginatedResponse } from '@/lib/api-client'
import type {
  Workspace,
  WorkspaceWithRole,
  CreateWorkspaceRequest,
  UpdateWorkspaceRequest,
  UpdateWorkspaceStatusRequest,
} from '../types'

/**
 * Get workspaces in current tenant with optional search
 */
export async function getWorkspaces(
  page = 1,
  perPage = 20,
  query?: string,
  status?: string,
  accessibleOnly?: boolean
): Promise<PaginatedResponse<WorkspaceWithRole>> {
  const response = await apiClient.get<PaginatedResponse<WorkspaceWithRole>>(
    '/tenant/workspaces',
    {
      params: {
        page,
        perPage,
        ...(query && { q: query }),
        ...(status && { status }),
        ...(accessibleOnly && { accessibleOnly: true }),
      },
    }
  )
  return response.data
}

/**
 * Create new workspace
 */
export async function createWorkspace(
  data: CreateWorkspaceRequest
): Promise<WorkspaceWithRole> {
  const response = await apiClient.post<WorkspaceWithRole>('/tenant/workspaces', data)
  return response.data
}

/**
 * Delete workspace
 */
export async function deleteWorkspace(workspaceId: string): Promise<void> {
  await apiClient.delete(`/tenant/workspaces/${workspaceId}`)
}

/**
 * Get current workspace (from context)
 */
export async function fetchCurrentWorkspace(): Promise<WorkspaceWithRole> {
  const response = await apiClient.get<WorkspaceWithRole>('/workspace')
  return response.data
}

/**
 * Update current workspace
 */
export async function updateCurrentWorkspace(
  data: UpdateWorkspaceRequest
): Promise<WorkspaceWithRole> {
  const response = await apiClient.put<WorkspaceWithRole>('/workspace', data)
  return response.data
}

/**
 * Archive current workspace
 */
export async function archiveCurrentWorkspace(): Promise<void> {
  await apiClient.delete('/workspace')
}

/**
 * Update workspace status
 */
export async function updateWorkspaceStatus(
  workspaceId: string,
  data: UpdateWorkspaceStatusRequest
): Promise<Workspace> {
  const response = await apiClient.patch<Workspace>(
    `/tenant/workspaces/${workspaceId}/status`,
    data
  )
  return response.data
}
