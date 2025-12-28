import { apiClient } from '@/lib/api-client';

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

export const systemUsersApi = {
  /**
   * Lista usuarios con roles de sistema asignados.
   * GET /api/v1/system/users
   * Solo SUPERADMIN puede acceder.
   */
  listSystemUsers: async (): Promise<SystemUser[]> => {
    const response = await apiClient.get('/system/users');
    return Array.isArray(response) ? response : ((response as { data?: SystemUser[] }).data || []);
  },

  /**
   * Asigna un rol de sistema a un usuario.
   * POST /api/v1/system/users/{userId}/role
   * Solo SUPERADMIN puede ejecutar.
   */
  assignRole: async (userId: string, data: AssignRoleRequest): Promise<void> => {
    await apiClient.post(`/system/users/${userId}/role`, data);
  },

  /**
   * Revoca el rol de sistema de un usuario.
   * DELETE /api/v1/system/users/{userId}/role
   * Solo SUPERADMIN puede ejecutar.
   */
  revokeRole: async (userId: string): Promise<void> => {
    await apiClient.delete(`/system/users/${userId}/role`);
  },
};
