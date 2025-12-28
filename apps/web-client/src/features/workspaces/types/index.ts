export type WorkspaceType = 'SYSTEM' | 'CLIENT';

export interface Workspace {
  id: string;
  tenantId?: string;
  name: string;
  type: WorkspaceType;
  status: string;
  settings?: Record<string, unknown>;
  createdAt: string;
  updatedAt?: string;
  role?: string; // From WorkspaceWithRoleResponse
}

export interface CreateWorkspaceRequest {
  tenantId?: string;
  name: string;
  type: WorkspaceType;
  settings?: Record<string, unknown>;
}

export interface UpdateWorkspaceRequest {
  name: string;
  settings?: Record<string, unknown>;
}
