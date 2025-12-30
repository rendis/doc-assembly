/**
 * Types for AI Contract Generator
 */

import type { PortableDocument } from './document-format';

/**
 * Request payload for contract generation API
 */
export interface GenerateContractRequest {
  /**
   * Type of input content: 'image', 'pdf', or 'text'
   */
  contentType: 'image' | 'pdf' | 'text';

  /**
   * Actual content:
   * - Base64 encoded string for image/pdf (without data URI prefix)
   * - Plain text for text descriptions
   */
  content: string;

  /**
   * MIME type for image/pdf content.
   * Required for image and pdf content types.
   * Examples: 'image/png', 'image/jpeg', 'application/pdf'
   */
  mimeType?: string;

  /**
   * Desired language for generated contract content.
   * Defaults to 'es' if not provided.
   */
  outputLang?: 'es' | 'en';
}

/**
 * Response from contract generation API
 */
export interface GenerateContractResponse {
  /**
   * Generated portable document ready to import into editor
   */
  document: PortableDocument;

  /**
   * Number of tokens consumed by the LLM
   */
  tokensUsed: number;

  /**
   * LLM model used for generation
   */
  model: string;

  /**
   * Timestamp when the document was generated (ISO 8601)
   */
  generatedAt: string;
}

/**
 * Metadata about a generation result
 */
export interface GenerationMetadata {
  tokensUsed: number;
  model: string;
  generatedAt?: string;
}
