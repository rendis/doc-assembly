import apiClient, { type PaginatedResponse } from '@/lib/api-client'
import type {
  Workspace,
  WorkspaceWithRole,
  CreateWorkspaceRequest,
  UpdateWorkspaceRequest,
} from '../types'

/**
 * List workspaces in current tenant
 */
export async function fetchWorkspaces(
  page = 1,
  perPage = 20
): Promise<PaginatedResponse<WorkspaceWithRole>> {
  const response = await apiClient.get<PaginatedResponse<WorkspaceWithRole>>(
    '/tenant/workspaces/list',
    { params: { page, perPage } }
  )
  return response.data
}

/**
 * Search workspaces by name
 */
export async function searchWorkspaces(
  query: string,
  page = 1,
  perPage = 20
): Promise<PaginatedResponse<WorkspaceWithRole>> {
  const response = await apiClient.get<PaginatedResponse<WorkspaceWithRole>>(
    '/tenant/workspaces/search',
    { params: { query, page, perPage } }
  )
  return response.data
}

/**
 * Create new workspace
 */
export async function createWorkspace(
  data: CreateWorkspaceRequest
): Promise<Workspace> {
  const response = await apiClient.post<Workspace>('/tenant/workspaces', data)
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
export async function fetchCurrentWorkspace(): Promise<Workspace> {
  const response = await apiClient.get<Workspace>('/workspace')
  return response.data
}

/**
 * Update current workspace
 */
export async function updateCurrentWorkspace(
  data: UpdateWorkspaceRequest
): Promise<Workspace> {
  const response = await apiClient.put<Workspace>('/workspace', data)
  return response.data
}

/**
 * Archive current workspace
 */
export async function archiveCurrentWorkspace(): Promise<void> {
  await apiClient.delete('/workspace')
}
