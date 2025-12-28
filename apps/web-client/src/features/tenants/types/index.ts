export interface Tenant {
  id: string;
  name: string;
  code: string;
  description?: string;
  settings?: Record<string, unknown>;
  createdAt: string;
  updatedAt?: string;
  role?: string; // From TenantWithRoleResponse
}

export interface CreateTenantRequest {
  name: string;
  code: string;
  description?: string;
}

export interface UpdateTenantRequest {
  name: string;
  description?: string;
  settings?: Record<string, unknown>;
}
