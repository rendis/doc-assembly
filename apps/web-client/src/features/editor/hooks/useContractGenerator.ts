/**
 * Hook for AI Contract Generation
 *
 * Manages the complete flow of generating contracts from AI:
 * 1. Calls the API with content
 * 2. Receives PortableDocument
 * 3. Imports document into editor
 * 4. Restores all state (pagination, signer roles, etc.)
 */

import { useState, useCallback } from 'react';
// @ts-expect-error - tiptap types incompatible with moduleResolution: bundler
import type { Editor } from '@tiptap/core';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import {
  contractGeneratorApi,
  type GenerateContractRequest,
} from '../api/contract-generator-api';
import { importDocument } from '../services/document-import';
import { usePaginationStore } from '../stores/pagination-store';
import { useSignerRolesStore } from '../stores/signer-roles-store';
import type { PortableDocument } from '../types/document-format';
import type { GenerationMetadata } from '../types/contract-generator';

/**
 * Hook options
 */
interface UseContractGeneratorOptions {
  /**
   * TipTap editor instance
   */
  editor: Editor | null;

  /**
   * Callback invoked when generation succeeds
   */
  onSuccess?: (document: PortableDocument, metadata: GenerationMetadata) => void;

  /**
   * Callback invoked when generation fails
   */
  onError?: (error: Error) => void;
}

/**
 * Hook return value
 */
interface UseContractGeneratorReturn {
  /**
   * Generates a contract from the provided content
   */
  generate: (request: Omit<GenerateContractRequest, 'outputLang'>) => Promise<void>;

  /**
   * Whether generation is in progress
   */
  isGenerating: boolean;

  /**
   * Error message if generation failed
   */
  error: string | null;

  /**
   * Metadata about the last successful generation
   */
  generationResult: GenerationMetadata | null;

  /**
   * Resets error and generation result
   */
  reset: () => void;
}

/**
 * Custom hook for managing AI contract generation
 *
 * @param options - Hook configuration
 * @returns Generation state and methods
 *
 * @example
 * ```typescript
 * const { generate, isGenerating, error } = useContractGenerator({
 *   editor,
 *   onSuccess: (doc) => {
 *     toast.success('Contract generated!');
 *   },
 *   onError: (err) => {
 *     toast.error(err.message);
 *   }
 * });
 *
 * // Generate from text
 * await generate({
 *   contentType: 'text',
 *   content: 'Lease agreement for 12 months...'
 * });
 * ```
 */
export function useContractGenerator({
  editor,
  onSuccess,
  onError,
}: UseContractGeneratorOptions): UseContractGeneratorReturn {
  const { i18n } = useTranslation();
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generationResult, setGenerationResult] = useState<GenerationMetadata | null>(null);

  const setPaginationConfig = usePaginationStore((s) => s.setPaginationConfig);
  const { setRoles, setWorkflowConfig } = useSignerRolesStore();

  const generate = useCallback(
    async (request: Omit<GenerateContractRequest, 'outputLang'>) => {
      if (!editor) {
        const errorMsg = 'Editor no disponible';
        setError(errorMsg);
        onError?.(new Error(errorMsg));
        return;
      }

      setIsGenerating(true);
      setError(null);

      try {
        // Add output language from i18n
        const fullRequest: GenerateContractRequest = {
          ...request,
          outputLang: i18n.language.startsWith('en') ? 'en' : 'es',
        };

        // Call API
        const response = await contractGeneratorApi.generate(fullRequest);

        // Store generation metadata
        const metadata: GenerationMetadata = {
          tokensUsed: response.tokensUsed,
          model: response.model,
          generatedAt: response.generatedAt,
        };
        setGenerationResult(metadata);

        // Import document into editor
        const importResult = importDocument(
          response.document,
          editor,
          {
            setPaginationConfig,
            setSignerRoles: setRoles,
            setWorkflowConfig,
          },
          [], // No backend variables needed for AI-generated content
          { validateReferences: false } // Skip variable reference validation
        );

        if (!importResult.success) {
          const errors = importResult.validation.errors.map((e) => e.message).join(', ');
          throw new Error(`Error al cargar documento generado: ${errors}`);
        }

        onSuccess?.(response.document, metadata);
      } catch (err) {
        let errorMessage = 'Error desconocido al generar el contrato';

        if (axios.isAxiosError(err)) {
          const status = err.response?.status;
          const serverMessage = err.response?.data?.error || err.response?.data?.message;

          switch (status) {
            case 400:
              errorMessage = `Error de validación: ${serverMessage || 'Datos inválidos'}`;
              break;
            case 401:
            case 403:
              errorMessage = 'No tienes permisos para generar contratos';
              break;
            case 500:
              errorMessage = 'Error del servidor. Por favor, intenta nuevamente.';
              break;
            case 503:
              errorMessage = 'El servicio de generación de IA no está disponible temporalmente. Por favor, intenta nuevamente en unos momentos.';
              break;
            default:
              errorMessage = serverMessage || err.message;
          }
        } else if (err instanceof Error) {
          errorMessage = err.message;
        }

        setError(errorMessage);
        onError?.(err instanceof Error ? err : new Error(errorMessage));
      } finally {
        setIsGenerating(false);
      }
    },
    [editor, i18n.language, setPaginationConfig, setRoles, setWorkflowConfig, onSuccess, onError]
  );

  const reset = useCallback(() => {
    setError(null);
    setGenerationResult(null);
  }, []);

  return {
    generate,
    isGenerating,
    error,
    generationResult,
    reset,
  };
}
