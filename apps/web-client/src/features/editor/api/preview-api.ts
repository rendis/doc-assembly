import { apiClient } from '@/lib/api-client';
import type { PreviewRequest } from '../types/preview';

export const previewApi = {
  /**
   * Generate preview PDF for a template version
   *
   * @param templateId - Template UUID
   * @param versionId - Version UUID
   * @param request - Injectable values
   * @returns PDF blob
   */
  generate: async (
    templateId: string,
    versionId: string,
    request: PreviewRequest
  ): Promise<Blob> => {
    const response = await apiClient.post(
      `/content/templates/${templateId}/versions/${versionId}/preview`,
      request,
      {
        responseType: 'blob', // CRÍTICO: Para recibir PDF como blob
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    // Con el interceptor corregido, response es el objeto AxiosResponse completo
    const blob = response.data;

    // Verificar que sea un blob válido
    if (!(blob instanceof Blob)) {
      throw new Error('Invalid response format');
    }

    // Verificar que sea PDF
    if (blob.type !== 'application/pdf') {
      // Podría ser un error JSON disfrazado
      const text = await blob.text();
      throw new Error(text || 'Invalid PDF response');
    }

    return blob;
  },
};
