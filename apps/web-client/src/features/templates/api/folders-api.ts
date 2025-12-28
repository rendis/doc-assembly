import { apiClient } from '@/lib/api-client';
import type {
  Folder,
  FolderTree,
  ListResponse,
  CreateFolderRequest,
  UpdateFolderRequest,
  MoveFolderRequest,
} from '../types';

export const foldersApi = {
  /**
   * Lista carpetas del workspace.
   * GET /api/v1/workspace/folders
   */
  list: async (): Promise<ListResponse<Folder>> => {
    return apiClient.get('/workspace/folders');
  },

  /**
   * Obtiene árbol de carpetas.
   * GET /api/v1/workspace/folders/tree
   */
  getTree: async (): Promise<FolderTree[]> => {
    const response = await apiClient.get('/workspace/folders/tree');
    // Normalize - might return { data: [] } or direct array
    if (Array.isArray(response)) {
      return response;
    }
    return response?.data ?? [];
  },

  /**
   * Obtiene detalle de una carpeta.
   * GET /api/v1/workspace/folders/{folderId}
   */
  get: async (folderId: string): Promise<Folder> => {
    return apiClient.get(`/workspace/folders/${folderId}`);
  },

  /**
   * Crea una nueva carpeta.
   * POST /api/v1/workspace/folders
   */
  create: async (data: CreateFolderRequest): Promise<Folder> => {
    return apiClient.post('/workspace/folders', data);
  },

  /**
   * Actualiza una carpeta.
   * PUT /api/v1/workspace/folders/{folderId}
   */
  update: async (folderId: string, data: UpdateFolderRequest): Promise<Folder> => {
    return apiClient.put(`/workspace/folders/${folderId}`, data);
  },

  /**
   * Elimina una carpeta (debe estar vacía).
   * DELETE /api/v1/workspace/folders/{folderId}
   */
  delete: async (folderId: string): Promise<void> => {
    return apiClient.delete(`/workspace/folders/${folderId}`);
  },

  /**
   * Mueve una carpeta a otro padre.
   * PATCH /api/v1/workspace/folders/{folderId}/move
   */
  move: async (folderId: string, data: MoveFolderRequest): Promise<Folder> => {
    return apiClient.patch(`/workspace/folders/${folderId}/move`, data);
  },
};
