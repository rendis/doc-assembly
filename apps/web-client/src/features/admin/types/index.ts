export interface SystemUser {
  id: string;
  email: string;
  name?: string;
  role: 'SUPERADMIN' | 'PLATFORM_ADMIN';
  createdAt: string;
  updatedAt?: string;
}

export interface AssignRoleRequest {
  role: 'SUPERADMIN' | 'PLATFORM_ADMIN';
}
