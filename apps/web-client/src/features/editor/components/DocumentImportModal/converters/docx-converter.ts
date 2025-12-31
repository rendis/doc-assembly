import mammoth from 'mammoth';
import type { ConversionResult } from '../types';

/**
 * Convert DOCX file to HTML using mammoth.js
 */
export async function convertDocxToHtml(file: File): Promise<ConversionResult> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.convertToHtml({ arrayBuffer });

    if (!result.value || result.value.trim().length === 0) {
      return {
        success: false,
        format: 'docx',
        content: '',
        contentType: 'html',
        error: 'El archivo DOCX está vacío o no contiene contenido convertible',
      };
    }

    return {
      success: true,
      format: 'docx',
      content: result.value,
      contentType: 'html',
      warnings: result.messages
        .filter((m) => m.type === 'warning')
        .map((m) => m.message),
    };
  } catch (error) {
    return {
      success: false,
      format: 'docx',
      content: '',
      contentType: 'html',
      error: error instanceof Error
        ? `Error al procesar DOCX: ${error.message}`
        : 'Error desconocido al procesar el archivo DOCX',
    };
  }
}
