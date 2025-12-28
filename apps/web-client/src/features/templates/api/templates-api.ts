import { apiClient } from '@/lib/api-client';
import type {
  Template,
  TemplateListItem,
  TemplateWithDetails,
  TemplateWithAllVersions,
  TemplateCreateResponse,
  CreateTemplateRequest,
  UpdateTemplateRequest,
  CloneTemplateRequest,
  ListResponse,
  TemplateListParams,
  AssignTagsRequest,
} from '../types';

export const templatesApi = {
  /**
   * Lista plantillas con filtros y paginación.
   * GET /api/v1/content/templates
   */
  list: async (params: TemplateListParams = {}): Promise<ListResponse<TemplateListItem>> => {
    const queryParams: Record<string, string | number | boolean> = {};

    if (params.folderId) queryParams.folderId = params.folderId;
    if (params.hasPublishedVersion !== undefined) queryParams.hasPublishedVersion = params.hasPublishedVersion;
    if (params.tagIds?.length) queryParams.tagIds = params.tagIds.join(',');
    if (params.search) queryParams.search = params.search;
    if (params.limit) queryParams.limit = params.limit;
    if (params.offset !== undefined) queryParams.offset = params.offset;

    const response = await apiClient.get('/content/templates', { params: queryParams }) as
      | TemplateListItem[]
      | { data: TemplateListItem[]; count: number };

    // Normalize response - API might return different formats
    if (Array.isArray(response)) {
      return { data: response, count: response.length };
    }
    return {
      data: response?.data ?? [],
      count: response?.count ?? 0,
    };
  },

  /**
   * Obtiene detalle de una plantilla con versión publicada.
   * GET /api/v1/content/templates/{templateId}
   */
  get: async (templateId: string): Promise<TemplateWithDetails> => {
    return apiClient.get(`/content/templates/${templateId}`);
  },

  /**
   * Obtiene plantilla con todas sus versiones.
   * GET /api/v1/content/templates/{templateId}/all-versions
   */
  getWithAllVersions: async (templateId: string): Promise<TemplateWithAllVersions> => {
    return apiClient.get(`/content/templates/${templateId}/all-versions`);
  },

  /**
   * Crea una nueva plantilla.
   * POST /api/v1/content/templates
   */
  create: async (data: CreateTemplateRequest): Promise<TemplateCreateResponse> => {
    return apiClient.post('/content/templates', data);
  },

  /**
   * Actualiza una plantilla.
   * PUT /api/v1/content/templates/{templateId}
   */
  update: async (templateId: string, data: UpdateTemplateRequest): Promise<Template> => {
    return apiClient.put(`/content/templates/${templateId}`, data);
  },

  /**
   * Elimina una plantilla.
   * DELETE /api/v1/content/templates/{templateId}
   */
  delete: async (templateId: string): Promise<void> => {
    return apiClient.delete(`/content/templates/${templateId}`);
  },

  /**
   * Clona una plantilla.
   * POST /api/v1/content/templates/{templateId}/clone
   */
  clone: async (templateId: string, data: CloneTemplateRequest): Promise<TemplateCreateResponse> => {
    return apiClient.post(`/content/templates/${templateId}/clone`, data);
  },

  /**
   * Asigna tags a una plantilla.
   * POST /api/v1/content/templates/{templateId}/tags
   */
  assignTags: async (templateId: string, data: AssignTagsRequest): Promise<void> => {
    return apiClient.post(`/content/templates/${templateId}/tags`, data);
  },

  /**
   * Remueve un tag de una plantilla.
   * DELETE /api/v1/content/templates/{templateId}/tags/{tagId}
   */
  removeTag: async (templateId: string, tagId: string): Promise<void> => {
    return apiClient.delete(`/content/templates/${templateId}/tags/${tagId}`);
  },
};
