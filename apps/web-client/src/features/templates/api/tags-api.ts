import { apiClient } from '@/lib/api-client';
import type {
  Tag,
  TagWithCount,
  ListResponse,
  CreateTagRequest,
  UpdateTagRequest,
} from '../types';

export const tagsApi = {
  /**
   * Lista tags del workspace con conteo de plantillas.
   * GET /api/v1/workspace/tags
   */
  list: async (): Promise<ListResponse<TagWithCount>> => {
    const response = await apiClient.get('/workspace/tags') as
      | TagWithCount[]
      | { data: TagWithCount[]; count: number };
    // Normalize response
    if (Array.isArray(response)) {
      return { data: response, count: response.length };
    }
    return {
      data: response?.data ?? [],
      count: response?.count ?? 0,
    };
  },

  /**
   * Obtiene detalle de un tag.
   * GET /api/v1/workspace/tags/{tagId}
   */
  get: async (tagId: string): Promise<Tag> => {
    return apiClient.get(`/workspace/tags/${tagId}`);
  },

  /**
   * Crea un nuevo tag.
   * POST /api/v1/workspace/tags
   */
  create: async (data: CreateTagRequest): Promise<Tag> => {
    return apiClient.post('/workspace/tags', data);
  },

  /**
   * Actualiza un tag.
   * PUT /api/v1/workspace/tags/{tagId}
   */
  update: async (tagId: string, data: UpdateTagRequest): Promise<Tag> => {
    return apiClient.put(`/workspace/tags/${tagId}`, data);
  },

  /**
   * Elimina un tag.
   * DELETE /api/v1/workspace/tags/{tagId}
   */
  delete: async (tagId: string): Promise<void> => {
    return apiClient.delete(`/workspace/tags/${tagId}`);
  },
};
