import { apiClient } from '@/lib/api-client';
import type { Tenant, CreateTenantRequest } from '../types';

const MOCK_TENANTS: Tenant[] = [
// ... (mock data remains)
];

export const tenantApi = {
  /**
   * Obtiene la lista de tenants a los que el usuario autenticado tiene acceso.
   * Basado en GET /api/v1/me/tenants/list
   */
  getMyTenants: async (): Promise<Tenant[]> => {
    if (import.meta.env.VITE_USE_MOCK_AUTH === 'true') {
        return new Promise(resolve => setTimeout(() => resolve(MOCK_TENANTS), 500));
    }
    const response = await apiClient.get('/me/tenants/list');
    // Manejar respuesta { data: [...], count: ... } o array directo por compatibilidad
    // @ts-expect-error - provisional typing
    return Array.isArray(response) ? response : (response.data || []);
  },

  /**
   * Crea un nuevo tenant (Solo SUPERADMIN).
   * Basado en POST /api/v1/system/tenants
   */
  createTenant: async (data: CreateTenantRequest): Promise<Tenant> => {
    return apiClient.post('/system/tenants', data);
  },

  /**
   * Busca tenants por nombre o código (System Admin).
   * GET /api/v1/system/tenants/search?q={query}
   */
  searchSystemTenants: async (query: string): Promise<Tenant[]> => {
    const response = await apiClient.get('/system/tenants/search', { params: { q: query } });
    // @ts-expect-error - provisional typing
    return Array.isArray(response) ? response : (response.data || []);
  },

  /**
   * Lista tenants de forma paginada (System Admin).
   * GET /api/v1/system/tenants/list?limit=20&offset=0
   */
  listSystemTenants: async (limit = 20, offset = 0): Promise<{ items: Tenant[], total: number }> => {
    const response = await apiClient.get('/system/tenants/list', { params: { limit, offset } });
    // @ts-expect-error - provisional typing until types are updated
    return { items: response.data || [], total: response.count || 0 };
  }
};
