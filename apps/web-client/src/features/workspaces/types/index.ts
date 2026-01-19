export type WorkspaceType = 'SYSTEM' | 'CLIENT'
export type WorkspaceStatus = 'ACTIVE' | 'SUSPENDED' | 'ARCHIVED'

export interface Workspace {
  id: string
  tenantId?: string
  name: string
  type: WorkspaceType
  status: WorkspaceStatus
  settings?: WorkspaceSettings
  createdAt: string
  updatedAt?: string
}

export interface WorkspaceSettings {
  theme?: string
  logoUrl?: string
  primaryColor?: string
}

export interface WorkspaceWithRole extends Workspace {
  role: string
  lastAccessedAt?: string | null
}

export interface CreateWorkspaceRequest {
  name: string
  type: WorkspaceType
}

export interface UpdateWorkspaceRequest {
  name?: string
  settings?: WorkspaceSettings
}
