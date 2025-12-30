import { apiClient } from '@/lib/api-client';
import type { InjectablesListResponse } from '../types/injectable';

export const injectablesApi = {
  /**
   * List all injectables for the current workspace
   * Header X-Workspace-ID is automatically injected by apiClient
   */
  list: async (): Promise<InjectablesListResponse> => {
    const response = (await apiClient.get('/content/injectables')) as
      | InjectablesListResponse
      | { items: InjectablesListResponse['items']; total: number };

    // Normalize response format
    if ('items' in response) {
      return {
        items: response.items ?? [],
        total: response.total ?? 0,
      };
    }

    return { items: [], total: 0 };
  },
};
