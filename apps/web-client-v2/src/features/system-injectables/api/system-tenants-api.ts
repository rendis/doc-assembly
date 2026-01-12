import { apiClient } from '@/lib/api-client'

// Types for system tenants API
export interface SystemTenant {
  id: string
  name: string
  code: string
  description?: string
  createdAt: string
  updatedAt: string
}

export interface TenantWorkspace {
  id: string
  name: string
  type: string
  status: string
  tenantId: string
  createdAt: string
  updatedAt: string
}

interface PaginationMeta {
  page: number
  perPage: number
  total: number
  totalPages: number
}

export interface ListTenantsResponse {
  data: SystemTenant[]
  pagination: PaginationMeta
}

export interface ListWorkspacesResponse {
  data: TenantWorkspace[]
  pagination: PaginationMeta
}

// System Tenants API (requires SUPERADMIN)
// GET /api/v1/system/tenants - List with pagination and optional search
export async function listSystemTenants(
  page = 1,
  perPage = 10,
  query?: string
): Promise<ListTenantsResponse> {
  const response = await apiClient.get<ListTenantsResponse>('/system/tenants', {
    params: { page, perPage, ...(query && { q: query }) },
  })
  return response.data
}

// GET /api/v1/system/tenants/{tenantId}/workspaces - List with pagination and optional search
export async function listTenantWorkspaces(
  tenantId: string,
  page = 1,
  perPage = 10,
  query?: string
): Promise<ListWorkspacesResponse> {
  const response = await apiClient.get<ListWorkspacesResponse>(
    `/system/tenants/${tenantId}/workspaces`,
    { params: { page, perPage, ...(query && { q: query }) } }
  )
  return response.data
}
