import { apiClient } from '@/lib/api-client';
import type {
  TemplateVersion,
  TemplateVersionDetail,
  ListTemplateVersionsResponse,
  CreateVersionRequest,
  CreateVersionFromExistingRequest,
  UpdateVersionRequest,
  SchedulePublishRequest,
  ScheduleArchiveRequest,
} from '../types';

export const versionsApi = {
  /**
   * Lista versiones de una plantilla.
   * GET /api/v1/content/templates/{templateId}/versions
   */
  list: async (templateId: string): Promise<ListTemplateVersionsResponse> => {
    return apiClient.get(`/content/templates/${templateId}/versions`);
  },

  /**
   * Obtiene detalle de una versión.
   * GET /api/v1/content/templates/{templateId}/versions/{versionId}
   */
  get: async (templateId: string, versionId: string): Promise<TemplateVersionDetail> => {
    return apiClient.get(`/content/templates/${templateId}/versions/${versionId}`);
  },

  /**
   * Crea una nueva versión.
   * POST /api/v1/content/templates/{templateId}/versions
   */
  create: async (templateId: string, data: CreateVersionRequest): Promise<TemplateVersion> => {
    return apiClient.post(`/content/templates/${templateId}/versions`, data);
  },

  /**
   * Crea una versión desde una existente.
   * POST /api/v1/content/templates/{templateId}/versions/from-existing
   */
  createFromExisting: async (
    templateId: string,
    data: CreateVersionFromExistingRequest
  ): Promise<TemplateVersion> => {
    return apiClient.post(`/content/templates/${templateId}/versions/from-existing`, data);
  },

  /**
   * Actualiza una versión.
   * PUT /api/v1/content/templates/{templateId}/versions/{versionId}
   */
  update: async (
    templateId: string,
    versionId: string,
    data: UpdateVersionRequest
  ): Promise<TemplateVersion> => {
    return apiClient.put(`/content/templates/${templateId}/versions/${versionId}`, data);
  },

  /**
   * Elimina una versión (solo DRAFT).
   * DELETE /api/v1/content/templates/{templateId}/versions/{versionId}
   */
  delete: async (templateId: string, versionId: string): Promise<void> => {
    return apiClient.delete(`/content/templates/${templateId}/versions/${versionId}`);
  },

  /**
   * Publica una versión.
   * POST /api/v1/content/templates/{templateId}/versions/{versionId}/publish
   */
  publish: async (templateId: string, versionId: string): Promise<void> => {
    return apiClient.post(`/content/templates/${templateId}/versions/${versionId}/publish`);
  },

  /**
   * Archiva una versión.
   * POST /api/v1/content/templates/{templateId}/versions/{versionId}/archive
   */
  archive: async (templateId: string, versionId: string): Promise<void> => {
    return apiClient.post(`/content/templates/${templateId}/versions/${versionId}/archive`);
  },

  /**
   * Programa publicación de una versión.
   * POST /api/v1/content/templates/{templateId}/versions/{versionId}/schedule-publish
   */
  schedulePublish: async (
    templateId: string,
    versionId: string,
    data: SchedulePublishRequest
  ): Promise<void> => {
    return apiClient.post(
      `/content/templates/${templateId}/versions/${versionId}/schedule-publish`,
      data
    );
  },

  /**
   * Programa archivación de una versión.
   * POST /api/v1/content/templates/{templateId}/versions/{versionId}/schedule-archive
   */
  scheduleArchive: async (
    templateId: string,
    versionId: string,
    data: ScheduleArchiveRequest
  ): Promise<void> => {
    return apiClient.post(
      `/content/templates/${templateId}/versions/${versionId}/schedule-archive`,
      data
    );
  },

  /**
   * Cancela programación de una versión.
   * DELETE /api/v1/content/templates/{templateId}/versions/{versionId}/schedule
   */
  cancelSchedule: async (templateId: string, versionId: string): Promise<void> => {
    return apiClient.delete(`/content/templates/${templateId}/versions/${versionId}/schedule`);
  },
};
