import { apiClient } from '@/lib/api-client';
import type { Workspace, CreateWorkspaceRequest } from '../types';

const MOCK_WORKSPACES: Workspace[] = [
    {
        id: 'ws-1',
        name: 'Legal Documents',
        type: 'CLIENT',
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
        role: 'OWNER'
    },
    {
        id: 'ws-system',
        name: 'System Templates',
        type: 'SYSTEM',
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
        role: 'ADMIN'
    }
];

export const workspaceApi = {
  /**
   * Obtiene los workspaces del tenant actual visibles para el usuario.
   * Basado en GET /api/v1/tenant/my-workspaces
   * Requiere X-Tenant-ID (manejado automáticamente por el interceptor).
   */
  getMyWorkspaces: async (): Promise<Workspace[]> => {
    if (import.meta.env.VITE_USE_MOCK_AUTH === 'true') {
        return new Promise(resolve => setTimeout(() => resolve(MOCK_WORKSPACES), 500));
    }
    const response = await apiClient.get('/tenant/my-workspaces');
    // @ts-expect-error - provisional typing
    return Array.isArray(response) ? response : (response.data || []);
  },

  /**
   * Lista todos los workspaces del tenant actual de forma paginada.
   * GET /api/v1/tenant/workspaces/list
   */
  listWorkspaces: async (limit = 20, offset = 0): Promise<{ items: Workspace[], total: number }> => {
    const response = await apiClient.get('/tenant/workspaces/list', { params: { limit, offset } });
    // @ts-expect-error - provisional typing
    return { items: response.data || [], total: response.count || 0 };
  },

  /**
   * Busca workspaces en el tenant actual por nombre.
   * GET /api/v1/tenant/workspaces/search?q={query}
   */
  searchWorkspaces: async (query: string): Promise<Workspace[]> => {
    const response = await apiClient.get('/tenant/workspaces/search', { params: { q: query } });
    // @ts-expect-error - provisional typing
    return Array.isArray(response) ? response : (response.data || []);
  },

  /**
   * Crea un nuevo workspace en el tenant actual.
   * POST /api/v1/tenant/workspaces
   */
  createWorkspace: async (data: CreateWorkspaceRequest): Promise<Workspace> => {
    return apiClient.post('/tenant/workspaces', data);
  },

  /**
   * Obtiene el detalle de un workspace específico.
   * Basado en GET /api/v1/workspace
   * Requiere X-Workspace-ID header.
   */
  getWorkspace: async (id: string): Promise<Workspace> => {
    if (import.meta.env.VITE_USE_MOCK_AUTH === 'true') {
        const ws = MOCK_WORKSPACES.find(w => w.id === id);
        if (ws) return Promise.resolve(ws);
        return Promise.reject(new Error('Workspace not found'));
    }
    // Nota: Aunque pasamos el ID aquí para lógica UI, 
    // el backend espera el header X-Workspace-ID que se setea en el store.
    // Para esta llamada específica, podríamos necesitar pasar el header explícitamente 
    // si el store aún no se ha actualizado, o confiar en el flujo de navegación.
    return apiClient.get('/workspace', {
        headers: { 'X-Workspace-ID': id }
    });
  }
};
