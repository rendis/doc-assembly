export type WorkspaceType = 'SYSTEM' | 'CLIENT'
export type WorkspaceStatus = 'ACTIVE' | 'SUSPENDED' | 'ARCHIVED'

export interface Workspace {
  id: string
  tenantId?: string
  name: string
  code: string
  type: WorkspaceType
  status: WorkspaceStatus
  createdAt: string
  updatedAt?: string
}

export interface WorkspaceWithRole extends Workspace {
  role: string
  lastAccessedAt?: string | null
}

export interface CreateWorkspaceRequest {
  name: string
  code: string
  type: WorkspaceType
}

export interface UpdateWorkspaceRequest {
  name?: string
}

export interface UpdateWorkspaceStatusRequest {
  status: WorkspaceStatus
}
