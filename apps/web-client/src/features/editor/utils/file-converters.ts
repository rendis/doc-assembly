/**
 * File Conversion Utilities for AI Contract Generator
 *
 * Handles conversion of files to formats accepted by the backend:
 * - Images/PDFs → Base64
 * - Word (.docx) → Plain text
 */

import mammoth from 'mammoth';

/**
 * Allowed MIME types for file upload
 */
export const ALLOWED_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
] as const;

/**
 * Maximum file size in megabytes
 */
export const MAX_FILE_SIZE_MB = 10;

/**
 * Content type for API requests
 */
export type ContentType = 'image' | 'pdf' | 'docx';

/**
 * File validation result
 */
export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Converts a File to base64 string without data URI prefix
 *
 * @param file - File to convert
 * @returns Promise resolving to base64 string (without 'data:...' prefix)
 *
 * @example
 * ```typescript
 * const base64 = await fileToBase64(file);
 * // base64: "iVBORw0KGgoAAAANSUhEUgA..." (without "data:image/png;base64," prefix)
 * ```
 */
export async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const result = reader.result as string;
      // Remove data URI prefix (e.g., "data:image/png;base64,")
      const base64Content = result.split(',')[1];
      resolve(base64Content);
    };

    reader.onerror = () => {
      reject(new Error('Error al leer el archivo'));
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Extracts plain text from a Word (.docx) file using mammoth.js
 *
 * @param file - Word file to process
 * @returns Promise resolving to extracted text
 * @throws Error if file cannot be read or is not a valid .docx
 *
 * @example
 * ```typescript
 * const text = await extractTextFromDocx(file);
 * // text: "CONTRATO DE ARRENDAMIENTO\n\nEntre las partes..."
 * ```
 */
export async function extractTextFromDocx(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });

    if (!result.value || result.value.trim().length === 0) {
      throw new Error('El archivo Word está vacío o no contiene texto extraíble');
    }

    return result.value;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Error al procesar el archivo Word: ${error.message}`);
    }
    throw new Error('Error desconocido al procesar el archivo Word');
  }
}

/**
 * Validates file type and size
 *
 * @param file - File to validate
 * @param allowedTypes - Array of allowed MIME types
 * @param maxSizeMB - Maximum file size in megabytes
 * @returns Validation result with error message if invalid
 *
 * @example
 * ```typescript
 * const result = validateFile(file, ALLOWED_MIME_TYPES, 10);
 * if (!result.valid) {
 *   console.error(result.error);
 * }
 * ```
 */
export function validateFile(
  file: File,
  allowedTypes: readonly string[],
  maxSizeMB: number = MAX_FILE_SIZE_MB
): FileValidationResult {
  // Check file type
  if (!allowedTypes.includes(file.type)) {
    const allowedExtensions = allowedTypes
      .map((type) => {
        if (type.startsWith('image/')) return type.replace('image/', '.');
        if (type === 'application/pdf') return '.pdf';
        if (type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
          return '.docx';
        }
        return type;
      })
      .join(', ');

    return {
      valid: false,
      error: `Tipo de archivo no soportado. Permitidos: ${allowedExtensions}`,
    };
  }

  // Check file size
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    return {
      valid: false,
      error: `El archivo excede el tamaño máximo permitido (${maxSizeMB}MB)`,
    };
  }

  return { valid: true };
}

/**
 * Determines the content type for API request based on file MIME type
 *
 * @param file - File to categorize
 * @returns Content type: 'image', 'pdf', or 'docx'
 * @throws Error if file type is not supported
 *
 * @example
 * ```typescript
 * const contentType = getContentTypeFromFile(file);
 * // For PNG: returns 'image'
 * // For PDF: returns 'pdf'
 * // For DOCX: returns 'docx'
 * ```
 */
export function getContentTypeFromFile(file: File): ContentType {
  if (file.type.startsWith('image/')) {
    return 'image';
  }

  if (file.type === 'application/pdf') {
    return 'pdf';
  }

  if (
    file.type ===
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    return 'docx';
  }

  throw new Error(`Tipo de archivo no soportado: ${file.type}`);
}

/**
 * Gets a human-readable file type name
 *
 * @param file - File to describe
 * @returns Human-readable file type
 */
export function getFileTypeName(file: File): string {
  const contentType = getContentTypeFromFile(file);

  switch (contentType) {
    case 'image':
      return 'Imagen';
    case 'pdf':
      return 'PDF';
    case 'docx':
      return 'Word';
    default:
      return 'Archivo';
  }
}

/**
 * Formats file size in human-readable format
 *
 * @param bytes - File size in bytes
 * @returns Formatted string (e.g., "1.5 MB", "234 KB")
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}
