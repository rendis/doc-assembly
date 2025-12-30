/**
 * API Client for AI Contract Generator
 */

import { apiClient } from '@/lib/api-client';
import type {
  GenerateContractRequest,
  GenerateContractResponse,
} from '../types/contract-generator';

// Re-export types for convenience
export type { GenerateContractRequest, GenerateContractResponse };

/**
 * AI Contract Generator API endpoints
 */
export const contractGeneratorApi = {
  /**
   * Generate a contract document from image/PDF/text using AI
   *
   * @param request - Generation request with content and options
   * @returns Promise with generated document and metadata
   * @throws Error if generation fails or user lacks permissions
   *
   * @example
   * ```typescript
   * // Generate from text description
   * const result = await contractGeneratorApi.generate({
   *   contentType: 'text',
   *   content: 'Contrato de arrendamiento para 12 meses...',
   *   outputLang: 'es'
   * });
   *
   * // Generate from image
   * const result = await contractGeneratorApi.generate({
   *   contentType: 'image',
   *   content: base64ImageData,
   *   mimeType: 'image/png',
   *   outputLang: 'es'
   * });
   * ```
   */
  generate: async (
    request: GenerateContractRequest
  ): Promise<GenerateContractResponse> => {
    return apiClient.post('/content/generate-contract', request);
  },
};
