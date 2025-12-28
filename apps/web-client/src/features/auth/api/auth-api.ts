import { apiClient } from '@/lib/api-client';
import type { UserRole } from '@/stores/auth-store';

export const authApi = {
  /**
   * Obtiene los roles de sistema del usuario actual.
   * GET /api/v1/me/roles
   */
  getMySystemRoles: async (): Promise<{ roles: UserRole[] }> => {
    return apiClient.get('/me/roles');
  },

  /**
   * Registra el acceso a un recurso (Tenant/Workspace) para historial.
   * POST /api/v1/me/access
   */
  recordAccess: async (entityId: string, entityType: 'TENANT' | 'WORKSPACE'): Promise<void> => {
    return apiClient.post('/me/access', { entityId, entityType });
  }
};
